import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft, Search, User, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConversations, useProductMessages, ProductConversation } from '../hooks/useMessages';
import { useSearchParams } from 'react-router-dom';
import { messageService } from '../services/database';

const Messages: React.FC = () => {
  const { user, profile } = useAuth();
  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useConversations();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ProductConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading: messagesLoading,
    sendMessage
  } = useProductMessages(
    selectedConversation?.product_id || null,
    selectedConversation?.other_participant?.id || null
  );

  // Handle creating a new conversation from URL parameters
  const handleCreateNewConversation = async () => {
    const productId = searchParams.get('product');
    const otherUserId = searchParams.get('user');
    
    if (!productId || !otherUserId || !user || isCreatingConversation) {
      return;
    }
    
    try {
      setIsCreatingConversation(true);
      console.log('🔄 Creating new conversation for product:', productId, 'with user:', otherUserId);
      
      // Check if conversation already exists in our list
      const existingConversation = conversations.find(c => 
        c.product_id === productId && c.other_participant.id === otherUserId
      );
      
      if (existingConversation) {
        console.log('✅ Conversation already exists, selecting it');
        setSelectedConversation(existingConversation);
        setIsMobileView(true);
        return;
      }
      
      // If no existing conversation, we need to create one by sending a message
      // This will trigger the workflow to create a conversation
      console.log('🔄 No existing conversation found, creating one...');
      
      // Use the product message workflow to create a conversation
      const result = await messageService.handleProductMessage(
        user.id,
        otherUserId,
        productId,
        "Product", // This will be replaced by the actual product title
        0, // This will be replaced by the actual product price
        "MGA", // Default currency
        "Seller" // This will be replaced by the actual seller name
      );
      
      console.log('✅ Conversation creation result:', result);
      
      // Refresh conversations to get the new one
      await refetchConversations();
      
      // Find and select the newly created conversation
      const newConversation = conversations.find(c => 
        c.product_id === productId && c.other_participant.id === otherUserId
      );
      
      if (newConversation) {
        setSelectedConversation(newConversation);
        setIsMobileView(true);
      } else {
        // If we still can't find it, create a temporary conversation object
        const tempConversation: ProductConversation = {
          id: `${productId}-${otherUserId}`,
          product_id: productId,
          product_title: "Loading...",
          other_participant: {
            id: otherUserId,
            name: "Loading...",
            verified: false
          },
          last_message_at: new Date().toISOString(),
          has_unread: false,
          is_buyer: true
        };
        
        setSelectedConversation(tempConversation);
        setIsMobileView(true);
        
        // Refresh again after a delay
        setTimeout(() => {
          refetchConversations();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Error creating new conversation:', error);
      alert('Erreur lors de la création de la discussion');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Auto-select conversation from URL parameters
  useEffect(() => {
    const productId = searchParams.get('product');
    const otherUserId = searchParams.get('user');
    
    if (productId && otherUserId && conversations.length > 0) {
      const conversation = conversations.find(c => 
        c.product_id === productId && c.other_participant.id === otherUserId
      );
      
      if (conversation) {
        console.log('🎯 Auto-selecting conversation for product:', productId);
        setSelectedConversation(conversation);
        setIsMobileView(true);
      } else {
        // If conversation doesn't exist yet, create it
        handleCreateNewConversation();
      }
    }
  }, [searchParams, conversations]);

  // Scroll to bottom when messages change or conversation is selected
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedConversation, messages.length]);

  // Refresh conversations when new messages arrive
  useEffect(() => {
    if (selectedConversation) {
      refetchConversations();
    }
  }, [messages.length, selectedConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
      // Refresh conversations to update last message
      refetchConversations();
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleConversationSelect = (conversation: ProductConversation) => {
    setSelectedConversation(conversation);
    setIsMobileView(true);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setIsMobileView(false);
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.other_participant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.product_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getConversationTitle = (conversation: ProductConversation) => {
    return conversation.product_title || `Conversation avec ${conversation.other_participant?.name || 'Utilisateur'}`;
  };

  const getOtherParticipantName = (conversation: ProductConversation) => {
    if (!user || !profile) return 'Utilisateur';
    
    // Show role-based labels
    if (conversation.is_buyer) {
      return `${conversation.other_participant?.name || 'Vendeur'} (Vendeur)`;
    } else {
      return `${conversation.other_participant?.name || 'Acheteur'} (Acheteur)`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à vos messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${isMobileView ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une conversation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune conversation</h3>
                    <p className="text-gray-600 text-sm">
                      Vos conversations apparaîtront ici. Contactez un vendeur depuis une page produit pour commencer.
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation)}
                      className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${
                              conversation.has_unread ? 'font-bold text-gray-900' : 'text-gray-900'
                            }`}>
                              {getConversationTitle(conversation)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatMessageTime(conversation.last_message_at)}
                            </p>
                          </div>
                          <p className={`text-xs text-gray-500 truncate mt-1 ${
                            conversation.has_unread ? 'font-semibold' : ''
                          }`}>
                            {getOtherParticipantName(conversation)}
                          </p>
                          {conversation.last_message && (
                            <p className={`text-sm text-gray-600 truncate mt-1 ${
                              conversation.has_unread ? 'font-semibold' : ''
                            }`}>
                              {conversation.last_message.content}
                            </p>
                          )}
                        </div>
                        {conversation.has_unread && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!isMobileView && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleBackToList}
                        className="md:hidden p-1 text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {getOtherParticipantName(selectedConversation)}
                        </h2>
                        <p className="text-sm text-gray-600">
                          À propos de: {selectedConversation.product_title}
                        </p>
                        {selectedConversation.other_participant?.verified && (
                          <p className="text-sm text-green-600">✓ Utilisateur vérifié</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messagesLoading ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Aucun message dans cette conversation</p>
                        <p className="text-sm text-gray-500 mt-1">Envoyez le premier message !</p>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="max-w-xs lg:max-w-md">
                              {/* Show sender name for received messages */}
                              {message.sender_id !== user.id && (
                                <p className="text-xs text-gray-500 mb-1 px-1">
                                  {message.sender_name}
                                </p>
                              )}
                              <div
                                className={`px-4 py-2 rounded-lg ${
                                  message.sender_id === user.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-200 text-gray-900'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <div className="flex items-center justify-end mt-1">
                                  <Clock className="h-3 w-3 mr-1 opacity-70" />
                                  <p className={`text-xs opacity-70 ${
                                    message.sender_id === user.id ? 'text-primary-100' : 'text-gray-500'
                                  }`}>
                                    {formatMessageTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Invisible element to scroll to */}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez une conversation</h3>
                    <p className="text-gray-600">
                      Choisissez une conversation dans la liste pour commencer à discuter.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;