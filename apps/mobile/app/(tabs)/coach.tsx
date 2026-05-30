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
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { api } from "../../services/api";
import type { CoachConversation, CoachMessage } from "../../types/api";
import { PremiumGateModal } from "../../components/ui/PremiumGateModal";

type LocalMessage = Pick<CoachMessage, "id" | "role" | "content" | "created_at">;

export default function CoachScreen() {
  const [conversation, setConversation] = useState<CoachConversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [premiumGate, setPremiumGate] = useState<{ used: number; limit: number } | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    initConversation();
  }, []);

  async function initConversation() {
    try {
      setIsLoading(true);
      const convs = await api.listCoachConversations();
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
    } catch {
      Alert.alert("Erreur", "Impossible de créer une nouvelle conversation.");
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-lumis-black items-center justify-center">
        <ActivityIndicator color="#C9A84C" size="large" />
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
      className="flex-1 bg-lumis-black"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(50)}
        className="px-6 pt-14 pb-4 border-b border-white/10 flex-row items-center justify-between"
      >
        <View>
          <Text className="text-lumis-gold font-display text-xl">✨ Lumis Coach</Text>
          <Text className="text-lumis-white/40 font-body text-xs mt-0.5">
            Propulsé par Llama 3.3 70B
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleNewChat}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-lumis-white/60 font-body text-xs">+ Nouveau</Text>
        </TouchableOpacity>
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
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3"
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
                <View className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <ActivityIndicator color="#C9A84C" size="small" />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <Animated.View
        entering={FadeInDown.delay(200)}
        className="px-4 py-3 border-t border-white/10 flex-row items-end gap-3"
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Pose une question beauté..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={500}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-lumis-white font-body text-sm"
          style={{ maxHeight: 120 }}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || isSending}
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: input.trim() && !isSending ? "#C9A84C" : "rgba(255,255,255,0.08)" }}
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
            : "bg-white/5 border border-white/10 rounded-tl-sm"
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
