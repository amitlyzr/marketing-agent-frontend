/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
    try {
        const { session_id, user_id, email } = await request.json();

        if (!session_id || !user_id || !email) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        console.log('🔄 COMPLETE INTERVIEW DEBUG:');
        console.log('   - session_id received:', session_id);
        console.log('   - user_id:', user_id);
        console.log('   - email:', email);
        console.log('   - URL will be:', `${BACKEND_API_URL}/chat/interview/complete/${session_id}`);
        
        // Complete the interview
        const completeResponse = await fetch(`${BACKEND_API_URL}/chat/interview/complete/${session_id}`, {
            method: 'POST'
        });

        if (!completeResponse.ok) {
            const errorData = await completeResponse.text();
            throw new Error(`Failed to complete interview: ${errorData}`);
        }

        const result = await completeResponse.json();
        console.log(' Interview completed:', result);

        // Initialize results tracking
        let processResult = null;
        let processError = null;
        let kbTrainingResult = null;
        let kbTrainingError = null;

        // Process the interview (S3 upload and PDF generation)
        console.log(' Starting interview processing...');
        try {
            const processResponse = await fetch(`${BACKEND_API_URL}/interview/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id,
                    email,
                })
            });

            if (processResponse.ok) {
                processResult = await processResponse.json();
                console.log(' Interview processing completed successfully:', processResult);
            } else {
                const errorText = await processResponse.text();
                processError = `HTTP ${processResponse.status}: ${errorText}`;
                console.error(' Interview processing failed:', processError);
            }
        } catch (error: any) {
            processError = error.message;
            console.error(' Interview processing error:', error);
        }

        // Call the KB training endpoint
        console.log(' Starting KB training...');
        try {
            const kbTrainingResponse = await fetch(`${BACKEND_API_URL}/interview/kb-training`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id,
                    email
                })
            });
            
            if (kbTrainingResponse.ok) {
                kbTrainingResult = await kbTrainingResponse.json();
                console.log(' KB training completed successfully:', kbTrainingResult);
            } else {
                const errorText = await kbTrainingResponse.text();
                kbTrainingError = `HTTP ${kbTrainingResponse.status}: ${errorText}`;
                console.error(' KB training failed:', kbTrainingError);
            }
        } catch (error: any) {
            kbTrainingError = error.message;
            console.error(' KB training error:', error);
        }

        return NextResponse.json({
            success: true,
            message: 'Interview completed and processed successfully',
            data: result,
            parsed_data: {
                user_id,
                email,
                session_id
            },
            processing_results: {
                interview_processing: {
                    success: processResult !== null,
                    result: processResult,
                    error: processError
                },
                kb_training: {
                    success: kbTrainingResult !== null,
                    result: kbTrainingResult,
                    error: kbTrainingError
                }
            }
        });

    } catch (error: any) {
        console.error('Error in complete-interview API:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.status || 500 }
        );
    }
}