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

        // Complete the interview
        const completeResponse = await fetch(`${BACKEND_API_URL}/chat/interview/complete/${session_id}`, {
            method: 'POST'
        });

        if (!completeResponse.ok) {
            const errorData = await completeResponse.text();
            throw new Error(`Failed to complete interview: ${errorData}`);
        }

        const result = await completeResponse.json();
        console.log('Interview completed:', result);

        // Process the interview
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
                console.log('Interview processing completed successfully');
            } else {
                console.warn('Interview processing failed, but interview marked as completed');
            }
        } catch (processError) {
            console.warn('Interview processing error:', processError);
        }

        // Call the test KB training endpoint
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
                const kbTrainingResult = await kbTrainingResponse.json();
                console.log('KB training completed:', kbTrainingResult);
            } else {
                console.warn('KB training failed, but interview was processed');
            }
        } catch (kbTrainingError) {
            console.warn('KB training error:', kbTrainingError);
        }

        return NextResponse.json({
            success: true,
            message: 'Interview completed and processed successfully',
            data: result
        });

    } catch (error: any) {
        console.error('Error in complete-interview API:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.status || 500 }
        );
    }
}