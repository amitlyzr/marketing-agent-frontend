"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Edit, Trash2, Plus, FileText, Info } from "lucide-react";
import { useAuth } from '@/components/providers/AuthProvider';
import { emailApi, emailContentApi } from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface Email {
    _id?: string;
    user_id: string;
    email: string;
    status: string;
    follow_up_count: number;
    last_sent_at?: string;
    created_at: string;
    updated_at: string;
}

interface EmailContent {
    _id?: string;
    user_id: string;
    email: string;
    content: string;
    created_at: string;
}

interface EmailTemplateForm {
    email: string;
    content: string;
}

export function EmailTemplatesPage() {
    const { userId } = useAuth();
    const [emails, setEmails] = useState<Email[]>([]);
    const [emailContents, setEmailContents] = useState<EmailContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<EmailContent | null>(null);

    const form = useForm<EmailTemplateForm>({
        defaultValues: {
            email: '',
            content: ''
        }
    });

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        if (!userId) return;

        try {
            setLoading(true);
            
            // Load emails and email contents in parallel
            const [emailList, contentList] = await Promise.all([
                emailApi.getEmails(userId),
                emailContentApi.listEmailContents(userId).catch(() => [])
            ]);

            setEmails(emailList || []);
            setEmailContents(contentList || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load email templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async (data: EmailTemplateForm) => {
        if (!userId) return;

        try {
            await emailContentApi.setEmailContent(userId, data.email, data.content);
            
            toast.success('Email template saved successfully');
            
            // Reload data and close dialog
            await loadData();
            setIsDialogOpen(false);
            setEditingContent(null);
            form.reset();
        } catch (error: any) {
            console.error('Error saving template:', error);
            toast.error(error.message || 'Failed to save template');
        }
    };

    const handleEditTemplate = (content: EmailContent) => {
        setEditingContent(content);
        form.reset({
            email: content.email,
            content: content.content
        });
        setIsDialogOpen(true);
    };

    const handleDeleteTemplate = async (content: EmailContent) => {
        if (!userId) return;

        try {
            await emailContentApi.deleteEmailContent(userId, content.email);
            toast.success('Email template deleted successfully');
            await loadData();
        } catch (error: any) {
            console.error('Error deleting template:', error);
            toast.error(error.message || 'Failed to delete template');
        }
    };

    const handleDeleteAllTemplates = async () => {
        if (!userId) return;

        try {
            const result = await emailContentApi.deleteAllEmailContents(userId);
            toast.success(`Deleted ${result.deleted_count} email templates`);
            await loadData();
        } catch (error: any) {
            console.error('Error deleting all templates:', error);
            toast.error(error.message || 'Failed to delete templates');
        }
    };

    const handleNewTemplate = () => {
        setEditingContent(null);
        form.reset({
            email: '',
            content: defaultTemplate
        });
        setIsDialogOpen(true);
    };

    const defaultTemplate = `Hi {email},

We're excited to move forward with your application. Please complete your interview here:
{interview_link}

This is follow-up #{follow_up_num} of our outreach.

Best regards,
The Hiring Team`;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getEmailsWithoutTemplates = () => {
        const emailsWithTemplates = new Set(emailContents.map(content => content.email));
        return emails.filter(email => !emailsWithTemplates.has(email.email));
    };

    if (loading) {
        return (
            <TabsContent value="templates" className="space-y-6">
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
        <TabsContent value="templates" className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-center">{emailContents.length}</div>
                        <p className="text-center text-sm text-muted-foreground">Custom Templates</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-center">{getEmailsWithoutTemplates().length}</div>
                        <p className="text-center text-sm text-muted-foreground">Using Default</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-center">{emails.length}</div>
                        <p className="text-center text-sm text-muted-foreground">Total Contacts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Template Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Email Templates
                    </CardTitle>
                    <CardDescription>
                        Create custom email templates for specific contacts. Emails without custom templates will use the default template.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex items-center justify-between">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={handleNewTemplate} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Custom Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingContent ? 'Edit Email Template' : 'Create Email Template'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Create a personalized email template for a specific contact. Use placeholders like {'{interview_link}'}, {'{follow_up_num}'}, and {'{email}'}.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={form.handleSubmit(handleSaveTemplate)} className="space-y-4">
                                    <div>
                                        <Label htmlFor="email">Email Address</Label>
                                        {editingContent ? (
                                            <Input 
                                                id="email"
                                                value={editingContent.email}
                                                disabled
                                                className="bg-gray-50"
                                            />
                                        ) : (
                                            <Select onValueChange={(value) => form.setValue('email', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an email address" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getEmailsWithoutTemplates().map((email) => (
                                                        <SelectItem key={email.email} value={email.email}>
                                                            {email.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="content">Email Content</Label>
                                        <Textarea 
                                            id="content"
                                            rows={12}
                                            placeholder="Enter your custom email template..."
                                            {...form.register('content', { required: true })}
                                        />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Available placeholders: <code>{'{interview_link}'}</code>, <code>{'{follow_up_num}'}</code>, <code>{'{email}'}</code>
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => {
                                            setIsDialogOpen(false);
                                            setEditingContent(null);
                                            form.reset();
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">
                                            {editingContent ? 'Update Template' : 'Create Template'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Delete All Templates Button */}
                        {emailContents.length > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                        Delete All Templates
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete All Templates</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete all {emailContents.length} custom email templates? 
                                            This action cannot be undone and all contacts will use the default template.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleDeleteAllTemplates}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Delete All Templates
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>

                    {/* Templates List */}
                    {emailContents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates</h3>
                            <p className="text-gray-600 mb-4">
                                All emails will use the default template. Create custom templates for personalized messaging.
                            </p>
                            {/* <Button onClick={handleNewTemplate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Custom Template
                            </Button> */}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>{emailContents.length}</strong> custom templates active. 
                                    <strong> {getEmailsWithoutTemplates().length}</strong> contacts using default template.
                                    {emailContents.length > 0 && (
                                        <span className="ml-2">
                                            Individual templates can be edited or deleted using the action buttons.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email Address</TableHead>
                                        <TableHead>Template Preview</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {emailContents.map((content, index) => (
                                        <TableRow key={content._id || index}>
                                            <TableCell className="font-medium">
                                                {content.email}
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-md">
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {content.content.split('\n')[0].substring(0, 80)}
                                                        {content.content.length > 80 ? '...' : ''}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(content.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleEditTemplate(content)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete the custom template for "{content.email}"? 
                                                                    This action cannot be undone and the contact will use the default template.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleDeleteTemplate(content)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Delete Template
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Default Template Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Default Email Template
                    </CardTitle>
                    <CardDescription>
                        This template is used for contacts without custom templates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                            {defaultTemplate}
                        </pre>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                        The scheduler automatically replaces placeholders with actual values when sending emails.
                    </p>
                </CardContent>
            </Card>

            {/* Template Usage Guide */}
            <Card>
                <CardHeader>
                    <CardTitle>Template Placeholders</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-900">{'{interview_link}'}</h4>
                                <p className="text-sm text-blue-700">
                                    Replaced with the unique interview URL for each contact
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h4 className="font-medium text-green-900">{'{follow_up_num}'}</h4>
                                <p className="text-sm text-green-700">
                                    Current follow-up number (1, 2, 3, etc.)
                                </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h4 className="font-medium text-purple-900">{'{email}'}</h4>
                                <p className="text-sm text-purple-700">
                                    The recipient's email address
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
}
