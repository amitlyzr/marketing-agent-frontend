import { NextRequest, NextResponse } from 'next/server';

const LYZR_TRAIN_PDF_URL = "https://rag-prod.studio.lyzr.ai/v3/train/pdf/";
const LYZR_HISTORY_API_URL = "https://agent-prod.studio.lyzr.ai/v1/sessions/{}/history";

interface ChatMessage {
    role: string;
    content: string;
    created_at?: string;
}

// Function to get chat history from Lyzr API
async function getChatHistory(sessionId: string, apiKey: string): Promise<ChatMessage[]> {
    try {
        console.log(`[PDF Training] Getting chat history for session: ${sessionId}`);
        
        const url = LYZR_HISTORY_API_URL.replace('{}', sessionId);
        console.log(`[PDF Training] Chat history URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': apiKey
            }
        });
        
        console.log(`[PDF Training] Chat history response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PDF Training] Chat history API error: ${errorText}`);
            throw new Error(`Failed to get chat history: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`[PDF Training] Chat history response type: ${typeof result}`);
        
        if (Array.isArray(result)) {
            console.log(`[PDF Training] Retrieved ${result.length} messages from chat history`);
            return result;
        } else {
            console.log(`[PDF Training] Chat history result is not an array, returning empty array`);
            return [];
        }
        
    } catch (error) {
        console.error(`[PDF Training] Failed to get chat history: ${error}`);
        throw error;
    }
}

// Function to generate simple PDF content as text (to be converted by backend)
function generateSimplePDFContent(chatHistory: ChatMessage[], userId: string, email: string, sessionId: string): string {
    console.log(`[PDF Training] Generating PDF content text for session: ${sessionId}`);
    console.log(`[PDF Training] Processing ${chatHistory.length} messages`);
    
    let content = `💬 Chat Conversation\n\n`;
    content += `Participant: ${email}\n`;
    content += `Session ID: ${sessionId}\n`;
    content += `User ID: ${userId}\n`;
    content += `Generated: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    })}\n`;
    content += `Total Messages: ${chatHistory.length}\n\n`;
    content += `Conversation History\n`;
    content += `===================\n\n`;
    
    chatHistory.forEach((message, index) => {
        const role = message.role || 'unknown';
        const messageContent = message.content || '';
        const timestamp = message.created_at || '';
        
        if (timestamp) {
            content += `[${new Date(timestamp).toLocaleString()}]\n`;
        }
        
        if (role === 'user') {
            content += `👤 User: ${messageContent}\n\n`;
        } else if (role === 'assistant') {
            content += `🤖 Assistant: ${messageContent}\n\n`;
        } else {
            content += `${role}: ${messageContent}\n\n`;
        }
        
        if (index < chatHistory.length - 1) {
            content += `---\n\n`;
        }
    });
    
    content += `\nEnd of Conversation\n`;
    
    console.log(`[PDF Training] PDF content generated, length: ${content.length} characters`);
    return content;
}

// Function to create a proper PDF file from text content
function createPDFFromText(textContent: string, filename: string): File {
    // For better compatibility with PDF parsers, create a more structured PDF
    // This creates a valid PDF that text extractors can easily read
    
    // Clean content for PDF
    const cleanContent = textContent
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    
    // Split into lines for better PDF structure
    const lines = cleanContent.split('\n');
    
    // Create PDF content with proper text objects for each line
    let pdfTextObjects = 'BT\n/F1 12 Tf\n50 750 Td\n';
    let currentY = 750;
    
    lines.forEach((line, index) => {
        if (line.trim()) {
            // Escape special PDF characters
            const escapedLine = line
                .replace(/\\/g, '\\\\')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .substring(0, 80); // Limit line length
            
            pdfTextObjects += `(${escapedLine}) Tj\n`;
            
            // Move to next line
            if (index < lines.length - 1) {
                currentY -= 14;
                if (currentY < 50) {
                    // Start new page if needed (simplified)
                    currentY = 750;
                }
                pdfTextObjects += `0 -14 Td\n`;
            }
        }
    });
    
    pdfTextObjects += 'ET\n';
    
    // PDF structure
    const pdfHeader = '%PDF-1.4\n';
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${pdfTextObjects.length} >>\nstream\n${pdfTextObjects}endstream\nendobj\n`;
    const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
    
    // Combine objects
    const body = obj1 + obj2 + obj3 + obj4 + obj5;
    
    // Calculate positions for xref
    const startPos = pdfHeader.length;
    const pos1 = startPos;
    const pos2 = pos1 + obj1.length;
    const pos3 = pos2 + obj2.length;
    const pos4 = pos3 + obj3.length;
    const pos5 = pos4 + obj4.length;
    const xrefPos = startPos + body.length;
    
    // Create xref table
    const xref = `xref\n0 6\n0000000000 65535 f \n${pos1.toString().padStart(10, '0')} 00000 n \n${pos2.toString().padStart(10, '0')} 00000 n \n${pos3.toString().padStart(10, '0')} 00000 n \n${pos4.toString().padStart(10, '0')} 00000 n \n${pos5.toString().padStart(10, '0')} 00000 n \n`;
    
    // Create trailer
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    
    // Combine all parts
    const fullPDF = pdfHeader + body + xref + trailer;
    
    console.log(`[PDF Generation] Created PDF with ${lines.length} lines, total size: ${fullPDF.length} bytes`);
    
    // Create File object
    const blob = new Blob([fullPDF], { type: 'application/pdf' });
    return new File([blob], filename, { type: 'application/pdf' });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        
        const file = formData.get('file') as File | null;
        const sessionId = formData.get('session_id') as string | null;
        const userId = formData.get('user_id') as string | null;
        const email = formData.get('email') as string | null;
        const ragId = formData.get('rag_id') as string;
        const apiKey = formData.get('api_key') as string;
        const dataParser = formData.get('data_parser') as string || 'llmsherpa';
        const chunkSize = formData.get('chunk_size') as string || '1000';
        const chunkOverlap = formData.get('chunk_overlap') as string || '100';
        const extraInfo = formData.get('extra_info') as string || '{}';

        // Validate required parameters
        if (!ragId) {
            return NextResponse.json(
                { error: 'rag_id is required' },
                { status: 400 }
            );
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'api_key is required' },
                { status: 400 }
            );
        }

        let finalFile: File;
        let generatedFromSession = false;

        if (!file && sessionId) {
            if (!userId || !email) {
                return NextResponse.json(
                    { error: 'user_id and email are required when using session_id' },
                    { status: 400 }
                );
            }

            console.log(`[PDF Training] Generating PDF from session: ${sessionId}`);
            
            try {
                const chatHistory = await getChatHistory(sessionId, apiKey);
                
                if (!chatHistory || chatHistory.length === 0) {
                    return NextResponse.json(
                        { error: 'No chat history found for the provided session_id' },
                        { status: 404 }
                    );
                }

                const pdfContent = generateSimplePDFContent(chatHistory, userId, email, sessionId);

                const filename = `interview_${userId}_${email}_${sessionId}.pdf`;
                finalFile = createPDFFromText(pdfContent, filename);
                generatedFromSession = true;
                
                console.log(`[PDF Training] PDF generated from session: ${filename}, size: ${finalFile.size} bytes`);
                console.log(`[PDF Training] Generated from ${chatHistory.length} chat messages`);
                
            } catch (sessionError) {
                console.error(`[PDF Training] Failed to generate PDF from session: ${sessionError}`);
                return NextResponse.json(
                    { 
                        error: 'Failed to generate PDF from session',
                        details: sessionError instanceof Error ? sessionError.message : 'Unknown error'
                    },
                    { status: 500 }
                );
            }
            
        } else if (file) {
            if (file.type !== 'application/pdf') {
                return NextResponse.json(
                    { error: 'File must be a PDF' },
                    { status: 400 }
                );
            }
            finalFile = file;
            console.log(`[PDF Training] Using uploaded file: ${file.name}, size: ${file.size} bytes`);
            
        } else {
            return NextResponse.json(
                { error: 'Either file or session_id (with user_id and email) must be provided' },
                { status: 400 }
            );
        }

        console.log(`[PDF Training] Starting training for RAG ID: ${ragId}`);
        console.log(`[PDF Training] File: ${finalFile.name}, Size: ${finalFile.size} bytes`);
        console.log(`[PDF Training] Parser: ${dataParser}, Chunk Size: ${chunkSize}, Overlap: ${chunkOverlap}`);
        console.log(`[PDF Training] Generated from session: ${generatedFromSession}`);

        const lyzrFormData = new FormData();
        lyzrFormData.append('file', finalFile);
        lyzrFormData.append('data_parser', dataParser);
        lyzrFormData.append('chunk_size', chunkSize);
        lyzrFormData.append('chunk_overlap', chunkOverlap);
        lyzrFormData.append('extra_info', extraInfo);

        const lyzrUrl = `${LYZR_TRAIN_PDF_URL}?rag_id=${ragId}`;
        
        console.log(`[PDF Training] Making request to: ${lyzrUrl}`);
        
        const response = await fetch(lyzrUrl, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'x-api-key': apiKey
            },
            body: lyzrFormData
        });

        console.log(`[PDF Training] Lyzr API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PDF Training] Lyzr API error: ${errorText}`);
            
            return NextResponse.json(
                { 
                    error: 'Failed to train PDF with Lyzr API',
                    details: errorText,
                    status: response.status
                },
                { status: response.status }
            );
        }

        const result = await response.json();
        console.log(`[PDF Training] Training completed successfully:`, result);

        return NextResponse.json({
            success: true,
            message: 'PDF training completed successfully',
            generated_from_session: generatedFromSession,
            session_id: sessionId,
            file_name: finalFile.name,
            file_size: finalFile.size,
            ...result
        });

    } catch (error) {
        console.error('[PDF Training] Error:', error);
        
        return NextResponse.json(
            { 
                error: 'Internal server error during PDF training',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
