
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Video, MessageSquare, Mail } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ChatClient } from './chat-client';
import { MailClient } from './mail-client';
import { MeetingClient } from './meeting-client';

function MeetingPageContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('video');
    const { unreadChatCount, unreadMailCount } = useSettings();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'chat' || tab === 'mail' || tab === 'video') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // This forces a re-render of the MeetingClient when the tab becomes active
    const isVideoTabActive = activeTab === 'video';

    return (
        <div className="space-y-8">
            <PageHeader
                title={'Communications Hub'}
                description="Connect with your team through video, chat, and mail."
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="video">
                        <Video className="mr-2 h-4 w-4" /> Video Meeting
                    </TabsTrigger>
                    <TabsTrigger value="chat">
                        <MessageSquare className="mr-2 h-4 w-4" /> Chat {unreadChatCount > 0 && <Badge className="ml-2">{unreadChatCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="mail">
                        <Mail className="mr-2 h-4 w-4" /> Mailing {unreadMailCount > 0 && <Badge className="ml-2">{unreadMailCount}</Badge>}
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="video">
                    <Card className="h-[70vh]">
                        <CardContent className="p-0 h-full">
                           {isVideoTabActive && <MeetingClient />}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="chat">
                   <ChatClient />
                </TabsContent>

                <TabsContent value="mail">
                   <MailClient />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function MeetingPage() {
    return <MeetingPageContent />;
}
