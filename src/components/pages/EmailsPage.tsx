/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Mail, Trash2, Eye, X, RefreshCw, RotateCcw, AlertTriangle, Settings, AlertCircle, Plus } from "lucide-react";
import { useAuth } from '@/components/providers/AuthProvider';
import { emailApi, interviewApi, smtpApi, schedulerApi, accountApi } from '@/lib/api';
import { toast } from 'sonner';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadItemProgress,
    FileUploadList,
    FileUploadTrigger,
    type FileUploadProps,
} from "@/components/ui/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Email {
    _id?: string;
    user_id: string;
    email: string;
    status: string;
    error_message?: string;
    follow_up_count: number;
    last_sent_at?: string;
    created_at: string;
    updated_at: string;
    interview_status?: string;
}

interface InterviewStatus {
    status: string;
    email: string;
}

export function EmailsPage() {
    const { userId } = useAuth();
    const [emails, setEmails] = useState<Email[]>([]);
    const [interviewStatuses, setInterviewStatuses] = useState<Record<string, InterviewStatus>>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [threadOpen, setThreadOpen] = useState(false);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadEmail, setThreadEmail] = useState<string | null>(null);
    const [emailThread, setEmailThread] = useState<any>([]);
    
    // Configuration validation state
    const [configurationValid, setConfigurationValid] = useState(false);
    const [configurationChecking, setConfigurationChecking] = useState(true);
    const [missingConfigs, setMissingConfigs] = useState<string[]>([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Load emails on component mount
    const loadInterviewStatuses = useCallback(async (emailList: Email[]) => {
        if (!userId) return;

        try {
            const statuses: Record<string, InterviewStatus> = {};
            
            for (const email of emailList) {
                try {
                    const status = await interviewApi.getInterviewStatus(userId, email.email);
                    statuses[email.email] = {
                        status: status.status,
                        email: email.email
                    };
                } catch {
                    // If interview doesn't exist, set status as 'not started'
                    statuses[email.email] = {
                        status: 'not started',
                        email: email.email
                    };
                }
            }
            
            setInterviewStatuses(statuses);
        } catch (error) {
            console.error('Error loading interview statuses:', error);
        }
    }, [userId]);

    const loadEmails = async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const emailList = await emailApi.getEmails(userId);
            setEmails(emailList || []);
            
            // Load interview statuses for each email
            await loadInterviewStatuses(emailList || []);
        } catch (error) {
            console.error('Error loading emails:', error);
            toast.error('Failed to load emails');
            setEmails([]);
        } finally {
            setLoading(false);
        }
    };

    const checkConfigurations = async () => {
        if (!userId) return;

        try {
            setConfigurationChecking(true);
            const missing: string[] = [];

            // Check SMTP configuration
            try {
                await smtpApi.getSMTP(userId);
            } catch {
                missing.push('SMTP credentials');
            }

            // Check Scheduler configuration
            try {
                await schedulerApi.getScheduler(userId);
            } catch {
                missing.push('Email scheduler settings');
            }

            // Check Agent configuration
            try {
                const account = await accountApi.getAccount(userId);
                if (!account.agent_id) {
                    missing.push('Interview agent');
                }
            } catch {
                missing.push('Interview agent');
            }

            setMissingConfigs(missing);
            setConfigurationValid(missing.length === 0);
        } catch (error) {
            console.error('Error checking configurations:', error);
            setConfigurationValid(false);
        } finally {
            setConfigurationChecking(false);
        }
    };

    useEffect(() => {
        if (userId) {
            loadEmails();
            checkConfigurations();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
        async (files, { onProgress, onSuccess, onError }) => {
            if (!userId) return;

            // Check if all configurations are valid before allowing upload
            if (!configurationValid) {
                for (const file of files) {
                    onError(file, new Error(`Please configure the following before uploading emails: ${missingConfigs.join(', ')}`));
                }
                toast.error(`Configuration required: ${missingConfigs.join(', ')}`);
                return;
            }

            try {
                setUploading(true);

                // Process each file individually
                const uploadPromises = files.map(async (file) => {
                    try {
                        // Validate file type
                        if (!file.name.endsWith('.csv')) {
                            throw new Error('Please select a CSV file');
                        }

                        // Simulate progress updates during upload
                        onProgress(file, 10);

                        const result = await emailApi.uploadCSV(userId, file);

                        onProgress(file, 100);
                        onSuccess(file);

                        toast.success(result.message || 'Emails uploaded successfully');

                    } catch (error: unknown) {
                        console.error('Error uploading CSV:', error);
                        onError(file, error instanceof Error ? error : new Error('Upload failed'));
                        toast.error(error instanceof Error ? error.message : 'Failed to upload emails');
                    }
                });

                await Promise.all(uploadPromises);

                // Clear files after successful upload
                setFiles([]);

                // Reload data after upload
                window.location.reload();

            } catch (error: unknown) {
                console.error('Error during upload:', error);
                toast.error('Upload failed');
            } finally {
                setUploading(false);
            }
        },
        [userId, configurationValid, missingConfigs],
    );

    const onFileReject = useCallback((file: File, message: string) => {
        toast.error(message, {
            description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
        });
    }, []);

    const handleViewThread = async (email: string) => {
        if (!userId) return;
        setThreadOpen(true);
        setThreadLoading(true);
        setThreadEmail(email);
        try {
            const thread = await emailApi.getEmailThread(userId, email);
            setEmailThread(thread);
            
            // Also get latest interview status for this specific email
            try {
                const status = await interviewApi.getInterviewStatus(userId, email);
                setInterviewStatuses(prev => ({
                    ...prev,
                    [email]: {
                        status: status.status,
                        email: email
                    }
                }));
            } catch (error) {
                // Interview doesn't exist, keep current status or set to 'not started'
            }
        } catch (error) {
            toast.error('Failed to load email thread');
            setEmailThread(null);
        } finally {
            setThreadLoading(false);
        }
    };

    const handleDeleteEmail = async (email: string) => {
        if (!userId) return;
        
        if (!confirm(`Are you sure you want to delete ${email} and all related data? This action cannot be undone.`)) {
            return;
        }

        try {
            await emailApi.deleteEmailCascade(userId, email);
            toast.success(`Successfully deleted ${email} and all related data`);
            window.location.reload();
        } catch (error: any) {
            console.error('Error deleting email:', error);
            toast.error(`Failed to delete ${email}: ${error.message || 'Unknown error'}`);
        }
    };

    const refreshData = async () => {
        if (!userId) return;
        
        try {
            setLoading(true);
            window.location.reload();
        } catch (error) {
            toast.error('Failed to refresh data');
        }
    };

    const retryEmail = async (email: string) => {
        if (!userId) return;
        
        try {
            // Reset the email status to pending to allow retry
            await emailApi.updateEmailStatus(userId, email, 'pending');
            toast.success(`Email ${email} has been reset to pending for retry`);
            
            // Refresh the page to show updated status
            window.location.reload();
        } catch (error: any) {
            console.error('Error retrying email:', error);
            toast.error(`Failed to retry email: ${error.message || 'Unknown error'}`);
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(emails.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentEmails = emails.slice(startIndex, endIndex);

    // Reset to first page when emails change (e.g., after upload)
    useEffect(() => {
        setCurrentPage(1);
    }, [emails.length]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const getStatusBadge = (status: string, errorMessage?: string) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
            sent: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
            delivered: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
            opened: { variant: 'default' as const, color: 'bg-purple-100 text-purple-800' },
            clicked: { variant: 'default' as const, color: 'bg-orange-100 text-orange-800' },
            bounced: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
            failed: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
            exhausted: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <div className="flex flex-col gap-1">
                <Badge variant={config.variant} className={config.color}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
                {errorMessage && (
                    <div className="text-xs text-red-600 max-w-[200px] truncate" title={errorMessage}>
                        {errorMessage}
                    </div>
                )}
            </div>
        );
    };

    const getInterviewStatusBadge = (status: string) => {
        const statusConfig = {
            'not started': { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
            'pending': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
            'started': { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
            'completed': { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['not started'];

        return (
            <Badge variant={config.variant} className={config.color}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    if (loading || configurationChecking) {
        return (
            <TabsContent value="emails" className="space-y-6 mt-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        );
    }

    return (
        <TabsContent value="emails" className="space-y-6 mt-4">
            {/* Configuration Warning */}
            {!configurationValid && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuration Required</AlertTitle>
                    <AlertDescription>
                        Please configure the following before uploading emails: {missingConfigs.join(', ')}. 
                        Go to Settings to set up these configurations.
                    </AlertDescription>
                </Alert>
            )}

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Email List
                    </CardTitle>
                    <CardDescription>
                        Upload a CSV file containing email addresses. The CSV should have a column named &ldquo;email&ldquo;.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FileUpload
                        value={files}
                        onValueChange={setFiles}
                        onUpload={onUpload}
                        onFileReject={onFileReject}
                        accept=".csv,text/csv"
                        maxFiles={1}
                        disabled={uploading || !configurationValid}
                        className="w-full"
                    >
                        <FileUploadDropzone>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center justify-center rounded-full border p-3">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-sm">Drag & drop your CSV file here</p>
                                <p className="text-muted-foreground text-xs">
                                    Or click to browse (CSV files only)
                                </p>
                            </div>
                            <FileUploadTrigger asChild>
                                <Button variant="outline" size="sm" className="mt-3">
                                    {uploading ? 'Uploading...' : 'Select CSV File'}
                                </Button>
                            </FileUploadTrigger>
                        </FileUploadDropzone>
                        <FileUploadList>
                            {files.map((file, index) => (
                                <FileUploadItem key={index} value={file} className="flex-col">
                                    <div className="flex w-full items-center gap-2">
                                        <FileUploadItemPreview />
                                        <FileUploadItemMetadata />
                                        <FileUploadItemDelete asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </FileUploadItemDelete>
                                    </div>
                                    <FileUploadItemProgress />
                                </FileUploadItem>
                            ))}
                        </FileUploadList>
                    </FileUpload>
                    <p className="text-sm text-muted-foreground mt-2">
                        Supported format: CSV with &ldquo;email&ldquo; column header
                    </p>
                </CardContent>
            </Card>

            {/* Email List */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Email Database ({emails.length} emails)
                            </CardTitle>
                            <CardDescription>
                                Manage your email contacts and view their campaign and interview status
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={refreshData}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {emails.length === 0 ? (
                        <div className="text-center py-12">
                            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                            <p className="text-gray-600 mb-4">
                                Upload a CSV file to get started with your email campaigns.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email Address</TableHead>
                                            <TableHead>Email Status</TableHead>
                                            <TableHead>Interview Status</TableHead>
                                            <TableHead>Follow-ups</TableHead>
                                            <TableHead>Last Sent</TableHead>
                                            <TableHead>Added</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentEmails.map((email, index) => {
                                            const interviewStatus = interviewStatuses[email.email];
                                            return (
                                                <TableRow key={email._id || index}>
                                                    <TableCell className="font-medium">
                                                        {email.email}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(email.status, email.error_message)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {interviewStatus ? 
                                                            getInterviewStatusBadge(interviewStatus.status) :
                                                            getInterviewStatusBadge('not started')
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {email.follow_up_count}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(email.last_sent_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(email.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Dialog open={threadOpen && threadEmail === email.email} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setThreadOpen(false);
                                                                    setThreadEmail(null);
                                                                }
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleViewThread(email.email)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-[90vw] sm:max-w-[80vw] lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
                                                                    <DialogHeader className="flex-shrink-0 pb-4">
                                                                        <DialogTitle className="text-lg font-semibold truncate">Email Thread for {email.email}</DialogTitle>
                                                                        <DialogDescription className="text-sm">
                                                                            All follow-up emails sent to this contact
                                                                            {interviewStatus && (
                                                                                <div className="mt-2 flex items-center gap-2">
                                                                                    <span className="text-sm">Interview Status:</span>
                                                                                    {getInterviewStatusBadge(interviewStatus.status)}
                                                                                </div>
                                                                            )}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="flex-1 overflow-hidden min-h-0">
                                                                        {threadLoading ? (
                                                                            <div className="py-8 text-center text-muted-foreground">Loading thread...</div>
                                                                        ) : emailThread && emailThread.thread && emailThread.thread.length > 0 ? (
                                                                            <ScrollArea className="h-full w-full">
                                                                                <div className="space-y-3 p-1 pr-3">
                                                                                    {emailThread.thread.map((item: any, idx: number) => (
                                                                                        <div key={item._id || idx} className="border rounded-lg p-3 bg-gray-50 shadow-sm">
                                                                                            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                                                                                                <span className="text-xs text-muted-foreground font-medium">Follow-up #{item.follow_up_number}</span>
                                                                                                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                                                                                            </div>
                                                                                            <div className="font-medium mb-2 text-gray-900 text-sm break-words">{item.subject || 'No Subject'}</div>
                                                                                            <div className="text-sm break-words text-gray-700 leading-relaxed max-h-32 overflow-y-auto bg-white p-2 rounded border">
                                                                                                {item.content}
                                                                                            </div>
                                                                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                                                                <span className="text-xs text-muted-foreground">Status: </span>
                                                                                                <span className="text-xs font-medium text-blue-600">{item.email_status || 'sent'}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </ScrollArea>
                                                                        ) : (
                                                                            <div className="py-8 text-center text-muted-foreground">No email thread found for this contact.</div>
                                                                        )}
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                            {/* Retry button for failed emails */}
                                                            {(email.status === 'failed' || email.status === 'bounced') && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => retryEmail(email.email)}
                                                                    title="Retry sending email"
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEmail(email.email)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious 
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (currentPage > 1) {
                                                            handlePageChange(currentPage - 1);
                                                        }
                                                    }}
                                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                            
                                            {/* Page numbers */}
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                                // Show first page, last page, current page, and pages around current
                                                if (
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <PaginationItem key={page}>
                                                            <PaginationLink
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handlePageChange(page);
                                                                }}
                                                                isActive={currentPage === page}
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                }
                                                
                                                // Show ellipsis
                                                if (
                                                    (page === currentPage - 2 && currentPage > 3) ||
                                                    (page === currentPage + 2 && currentPage < totalPages - 2)
                                                ) {
                                                    return (
                                                        <PaginationItem key={`ellipsis-${page}`}>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    );
                                                }
                                                
                                                return null;
                                            })}
                                            
                                            <PaginationItem>
                                                <PaginationNext 
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (currentPage < totalPages) {
                                                            handlePageChange(currentPage + 1);
                                                        }
                                                    }}
                                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                    
                                    {/* Pagination info */}
                                    <p className="text-sm text-muted-foreground text-center mt-2">
                                        Showing {startIndex + 1} to {Math.min(endIndex, emails.length)} of {emails.length} emails
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
    );
}
