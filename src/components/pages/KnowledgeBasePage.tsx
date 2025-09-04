"use client"

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, AlertCircle, RefreshCw, List, Folder } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PDF {
    id: string;
    email: string;
    pdf_url: string;
    signed_url: string;
    completed_at: string;
    session_id: string;
    message_count: number;
    type: string;
    kb_trained: boolean;
    signed_url_expires_at?: string;
    title?: string;
    subheading?: string;
    category?: string;
}

interface CategorizedPDFs {
    [category: string]: PDF[];
}

export function KnowledgeBasePage() {
    const { userId } = useAuth();
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [categorizedPdfs, setCategorizedPdfs] = useState<CategorizedPDFs>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'categorized' | 'all'>('categorized');

    console.log(userId);

    const fetchPdfs = useCallback(async () => {
        if (!userId) {
            setError("User ID not available. Please log in.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch categorized PDFs first
            const categorizedResponse = await fetch(`${BACKEND_API_URL}/knowledge-base/pdfs-categorized/${userId}`);
            
            if (categorizedResponse.ok) {
                const categorizedData = await categorizedResponse.json();
                console.log('Categorized PDFs Response:', categorizedData);
                
                // Check if we have categories data
                if (categorizedData.categories && Object.keys(categorizedData.categories).length > 0) {
                    setCategorizedPdfs(categorizedData.categories);
                } else {
                    // No categorized data, clear it
                    setCategorizedPdfs({});
                }
            } else {
                // If categorized endpoint fails, clear categorized data
                setCategorizedPdfs({});
            }

            // Always fetch all PDFs as fallback
            const response = await fetch(`${BACKEND_API_URL}/knowledge-base/pdfs/${userId}`);

            if (response.ok) {
                const data = await response.json();
                console.log('All PDFs Response:', data);
                setPdfs(data.pdfs || []);
            } else if (response.status === 404) {
                // No PDFs found, clear arrays
                setPdfs([]);
            } else {
                throw new Error(`Failed to fetch PDFs: ${response.status} ${response.statusText}`);
            }
        } catch (err) {
            console.error('Failed to fetch PDFs:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch PDFs');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPdfs();
    }, [fetchPdfs]);

    const openPdf = async (pdf: PDF) => {
        try {
            // Use signed URL if available and not expired, otherwise fallback to regular URL
            let url = pdf.signed_url || pdf.pdf_url;
            
            // Check if signed URL is expired or about to expire (in next 5 minutes)
            const now = new Date();
            const expiresAt = pdf.signed_url_expires_at ? new Date(pdf.signed_url_expires_at) : null;
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
            
            if (!pdf.signed_url || (expiresAt && expiresAt < fiveMinutesFromNow)) {
                // If signed URL is expired or about to expire, fetch a new one
                const response = await fetch(`/api/pdfs/${pdf.id}/signed-url`);
                if (response.ok) {
                    const data = await response.json();
                    url = data.signed_url;
                    // Update the PDF object with the new URL and expiration
                    pdf.signed_url = data.signed_url;
                    pdf.signed_url_expires_at = data.expires_at;
                } else {
                    console.error('Failed to get signed URL, using direct URL');
                    url = pdf.pdf_url;
                }
            }
            
            if (!url) {
                console.error('No valid URL available for PDF');
                setError('No valid URL available for PDF');
                return;
            }
            
            // Open in new tab for viewing
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            
            // If window couldn't be opened, show error
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                setError('Could not open PDF. Please check your popup blocker.');
            }
        } catch (error) {
            console.error('Error opening PDF:', error);
            setError('Failed to open PDF. Please try again.');
        }
    };

    const refreshPdfs = async () => {
        setError(null);
        await fetchPdfs();
    };

    const renderPDFItem = (pdf: PDF) => (
        <div key={pdf.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 flex-1">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                            {pdf.title || pdf.email}
                        </p>
                        <Badge 
                            variant={pdf.type === 'chat_session' ? 'default' : 'secondary'} 
                            className="text-xs flex-shrink-0"
                        >
                            {pdf.type === 'chat_session' ? 'Chat Session' : 'Interview'}
                        </Badge>
                        {pdf.kb_trained && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 flex-shrink-0">
                                KB Trained
                            </Badge>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 mb-1">
                        {pdf.subheading && <p className="italic">{pdf.subheading}</p>}
                        {!pdf.subheading && <p>{pdf.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>
                            {pdf.completed_at 
                                ? new Date(pdf.completed_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                                : 'Unknown date'
                            }
                        </span>
                        {pdf.message_count > 0 && (
                            <>
                                <span>•</span>
                                <span>{pdf.message_count} messages</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => openPdf(pdf)}
                title={pdf.signed_url_expires_at ? `Expires at: ${new Date(pdf.signed_url_expires_at).toLocaleString()}` : ''}
            >
                <Download className="h-4 w-4" />
                Download
            </Button>
        </div>
    );

    const renderCategorizedView = () => {
        const categoryKeys = Object.keys(categorizedPdfs);
        
        if (categoryKeys.length === 0) {
            return null;
        }

        return (
            <div className="space-y-6">
                {categoryKeys.map(category => (
                    <div key={category} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">{category}</h3>
                            <Badge variant="secondary" className="text-xs">
                                {categorizedPdfs[category].length}
                            </Badge>
                        </div>
                        <div className="grid gap-4">
                            {categorizedPdfs[category].map(renderPDFItem)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAllPdfsView = () => {
        if (pdfs.length === 0) {
            return null;
        }

        return (
            <div className="grid gap-4">
                {pdfs.map(renderPDFItem)}
            </div>
        );
    };

    const hasAnyCategorizedPdfs = Object.keys(categorizedPdfs).length > 0;
    const totalCategorizedCount = Object.values(categorizedPdfs).reduce((sum, pdfs) => sum + pdfs.length, 0);

    // Auto-switch to the appropriate view based on available data
    useEffect(() => {
        if (hasAnyCategorizedPdfs && viewMode === 'all' && pdfs.length === 0) {
            // If we have categorized PDFs but no PDFs in all view, switch to categorized
            setViewMode('categorized');
        } else if (!hasAnyCategorizedPdfs && viewMode === 'categorized' && pdfs.length > 0) {
            // If we have no categorized PDFs but have PDFs in all view, switch to all
            setViewMode('all');
        }
    }, [hasAnyCategorizedPdfs, pdfs.length, viewMode]);

    return (
        <TabsContent value="knowledge-base" className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                    <p className="text-muted-foreground">
                        Documentation, guides, and processed conversation transcripts
                    </p>
                </div>
                <Button
                    onClick={refreshPdfs}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Knowledge Base PDFs Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <CardTitle>Knowledge Base Documents</CardTitle>
                        </div>
                        {(hasAnyCategorizedPdfs || pdfs.length > 0) && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={viewMode === 'categorized' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('categorized')}
                                    className="gap-1"
                                    disabled={!hasAnyCategorizedPdfs}
                                >
                                    <Folder className="h-4 w-4" />
                                    Categories ({Object.keys(categorizedPdfs).length})
                                </Button>
                                <Button
                                    variant={viewMode === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('all')}
                                    className="gap-1"
                                >
                                    <List className="h-4 w-4" />
                                    All Documents ({pdfs.length})
                                </Button>
                            </div>
                        )}
                    </div>
                    <CardDescription>
                        {viewMode === 'categorized' 
                            ? 'Documents organized by AI-generated categories'
                            : 'All processed conversations and interview transcripts stored in your knowledge base'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>Loading documents...</span>
                        </div>
                    ) : error ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    ) : !hasAnyCategorizedPdfs && pdfs.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents available</h3>
                            <p className="text-gray-500 mb-4">
                                Your knowledge base is empty. Start by conducting interviews or chat sessions to build your knowledge base.
                            </p>
                            
                            {/* Debug Info */}
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                                <p className="text-blue-700">
                                    <strong>Status:</strong> Successfully connected to API
                                </p>
                                <p className="text-blue-600">
                                    User ID: {userId || 'Not available'}
                                </p>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                                <p className="font-medium mb-3">To add documents to your knowledge base:</p>
                                <div className="space-y-2 text-left">
                                    <div className="flex items-start gap-2">
                                        <span className="font-medium text-blue-600">1.</span>
                                        <span>Go to the <strong>Interviews</strong> tab and complete some interviews</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-medium text-blue-600">2.</span>
                                        <span>Start <strong>chat conversations</strong> and process them to the knowledge base</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-medium text-blue-600">3.</span>
                                        <span>Use the <strong>process to KB</strong> feature to train your knowledge base</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-medium text-blue-600">4.</span>
                                        <span>Processed documents will automatically appear here</span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">
                                        💡 <strong>Tip:</strong> Documents are automatically categorized using AI
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    {viewMode === 'categorized' 
                                        ? `Found ${totalCategorizedCount} document${totalCategorizedCount !== 1 ? 's' : ''} in ${Object.keys(categorizedPdfs).length} categories`
                                        : `Found ${pdfs.length} document${pdfs.length !== 1 ? 's' : ''} in your knowledge base`
                                    }
                                </p>
                            </div>
                            
                            {viewMode === 'categorized' && hasAnyCategorizedPdfs ? (
                                renderCategorizedView()
                            ) : viewMode === 'categorized' && !hasAnyCategorizedPdfs && pdfs.length > 0 ? (
                                <div className="text-center py-8">
                                    <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categorized documents</h3>
                                    <p className="text-gray-500 mb-4">
                                        Your documents haven&apos;t been categorized yet, but you have {pdfs.length} document{pdfs.length !== 1 ? 's' : ''} available.
                                    </p>
                                    <Button 
                                        onClick={() => setViewMode('all')}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <List className="h-4 w-4" />
                                        View All Documents
                                    </Button>
                                </div>
                            ) : (
                                renderAllPdfsView()
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
    );
}
