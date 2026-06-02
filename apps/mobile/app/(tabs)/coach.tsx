import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../services/api";
import type { CoachConversation, CoachMessage } from "../../types/api";
import { PremiumGateModal } from "../../components/ui/PremiumGateModal";

type LocalMessage = Pick<CoachMessage, "id" | "role" | "content" | "created_at">;

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<CoachConversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [allConversations, setAllConversations] = useState<CoachConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [premiumGate, setPremiumGate] = useState<{ used: number; limit: number } | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initConversation();
  }, []);

  async function initConversation() {
    try {
      setIsLoading(true);
      const convs = await api.listCoachConversations();
      setAllConversations(convs);
      if (convs.length > 0) {
        const conv = await api.getCoachConversation(convs[0].id);
        setConversation(conv);
        setMessages(conv.messages ?? []);
      } else {
        const conv = await api.createCoachConversation();
        setConversation(conv);
        setMessages([]);
      }
    } catch {
      Alert.alert("Erreur", "Impossible de charger le coach.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadConversation(convId: string) {
    try {
      setShowHistory(false);
      setIsLoading(true);
      const conv = await api.getCoachConversation(convId);
      setConversation(conv);
      setMessages(conv.messages ?? []);
    } catch {
      Alert.alert("Erreur", "Impossible de charger la conversation.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || !conversation || isSending) return;

    const userMsg: LocalMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await api.sendCoachMessage(conversation.id, userMsg.content);
      setMessages((prev) => [...prev, reply]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { used?: number; limit?: number } } };
      if (apiErr?.response?.status === 402) {
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setPremiumGate({
          used: apiErr.response?.data?.used ?? 10,
          limit: apiErr.response?.data?.limit ?? 10,
        });
      } else {
        Alert.alert("Erreur", "Le coach est momentanément indisponible.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleNewChat() {
    try {
      const conv = await api.createCoachConversation();
      setConversation(conv);
      setMessages([]);
      // Refresh history list
      const convs = await api.listCoachConversations();
      setAllConversations(convs);
    } catch {
      Alert.alert("Erreur", "Impossible de créer une nouvelle conversation.");
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-lumis-black items-center justify-center">
        <ActivityIndicator color="#C9826B" size="large" />
      </View>
    );
  }

  return (
    <>
    <PremiumGateModal
      visible={premiumGate !== null}
      onClose={() => setPremiumGate(null)}
      title="Limite atteinte"
      message="Tu as utilisé tous tes messages gratuits aujourd'hui. Passe à Premium pour un accès illimité au Coach IA."
      used={premiumGate?.used}
      limit={premiumGate?.limit}
    />
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#EDE4D4" }}
      behavior="padding"
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      style={{ flex: 1, backgroundColor: "#EDE4D4" }}
    >
      {/* History modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowHistory(false)} />
          <View style={{
            backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "70%", paddingBottom: insets.bottom + 16,
          }}>
            <View style={{ padding: 20, borderBottomWidth: 0.5, borderBottomColor: "rgba(201,130,107,0.12)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>Historique des conversations</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {allConversations.length === 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 20 }}>Aucune conversation</Text>
              ) : (
                allConversations.map((conv) => {
                  const isActive = conv.id === conversation?.id;
                  const date = new Date(conv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                  return (
                    <TouchableOpacity
                      key={conv.id}
                      onPress={() => loadConversation(conv.id)}
                      style={{
                        backgroundColor: isActive ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.65)",
                        borderWidth: 0.5,
                        borderColor: isActive ? "rgba(201,168,76,0.4)" : "rgba(201,130,107,0.12)",
                        borderRadius: 16, padding: 14,
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ color: isActive ? "#C9826B" : "#fff", fontWeight: "600", fontSize: 14 }}>
                          {isActive ? "✨ Conversation active" : `Conversation`}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{date}</Text>
                      </View>
                      {conv.messages && conv.messages.length > 0 && (
                        <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                          {conv.messages[0].content}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(50)}
        style={{ paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(201,130,107,0.12)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <View>
          <Text style={{ color: "#C9826B", fontFamily: "PlayfairDisplay-Regular", fontSize: 20 }}>✨ Lumis Coach</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>Llama 3.3 70B</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {allConversations.length > 1 && (
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={{ backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>🕐 Historique</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNewChat}
            style={{ backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Messages */}
      {messages.length === 0 ? (
        <Animated.View
          entering={FadeInDown.delay(150)}
          className="flex-1 items-center justify-center px-8"
        >
          <Text className="text-lumis-gold font-display text-5xl mb-4">✨</Text>
          <Text className="text-lumis-white font-display text-xl text-center mb-2">
            Bonjour ! Je suis ton coach beauté.
          </Text>
          <Text className="text-lumis-white/50 font-body text-sm text-center leading-6">
            Pose-moi n'importe quelle question sur ta peau, ta routine, tes produits ou ta couleur de saison.
          </Text>
          <View className="mt-8 gap-3 w-full">
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setInput(s)}
                className="bg-card border border-line rounded-2xl px-4 py-3"
                activeOpacity={0.7}
              >
                <Text className="text-lumis-white/70 font-body text-sm">{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index < 10 ? 0 : 50)}>
              <MessageBubble message={item} />
            </Animated.View>
          )}
          ListFooterComponent={
            isSending ? (
              <View className="flex-row items-center gap-2 px-4 py-3 mt-1">
                <View className="w-8 h-8 rounded-full bg-lumis-gold/20 border border-lumis-gold/30 items-center justify-center">
                  <Text className="text-xs">✨</Text>
                </View>
                <View className="bg-card border border-line rounded-2xl rounded-tl-sm px-4 py-3">
                  <ActivityIndicator color="#C9826B" size="small" />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <Animated.View
        entering={FadeInDown.delay(200)}
        className="px-4 py-3 border-t border-line flex-row items-end gap-3"
      >
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Pose une question beauté..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={500}
          style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.6)",
            borderWidth: 0.5, borderColor: "rgba(201,130,107,0.2)",
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12,
            color: "#fff", fontSize: 14, maxHeight: 120, minHeight: 46,
          }}
          onFocus={() => {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300);
          }}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || isSending}
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: input.trim() && !isSending ? "#C9826B" : "rgba(201,130,107,0.12)" }}
          activeOpacity={0.8}
        >
          <Text className="text-base">→</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
    </>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === "user";
  return (
    <View className={`flex-row items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-lumis-gold/20 border border-lumis-gold/30 items-center justify-center mb-1">
          <Text className="text-xs">✨</Text>
        </View>
      )}
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-lumis-gold/20 border border-lumis-gold/30 rounded-tr-sm"
            : "bg-card border border-line rounded-tl-sm"
        }`}
      >
        <Text
          className={`font-body text-sm leading-6 ${
            isUser ? "text-lumis-gold" : "text-lumis-white/90"
          }`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const SUGGESTIONS = [
  "Quelle routine skincare pour ma peau mixte ?",
  "Comment sublimer ma couleur de saison ?",
  "Quels produits pour réduire l'acné ?",
];
