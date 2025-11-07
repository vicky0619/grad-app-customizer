import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { Streamdown } from "streamdown";

interface DocumentDiscussionProps {
  documentId: number;
  onRegenerateRequest: (feedback: string) => void;
}

export function DocumentDiscussion({ documentId, onRegenerateRequest }: DocumentDiscussionProps) {
  const [message, setMessage] = useState("");
  const { data: discussions, refetch } = trpc.programs.getDiscussions.useQuery({ documentId });
  const discussMutation = trpc.programs.discuss.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    discussMutation.mutate({ documentId, message });
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">討論與修改建議</h3>
      
      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {discussions?.map((discussion) => (
          <div
            key={discussion.id}
            className={`p-3 rounded-lg ${
              discussion.role === "user"
                ? "bg-blue-50 ml-8"
                : "bg-gray-50 mr-8"
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {discussion.role === "user" ? "您" : "AI助手"}
            </div>
            <div className="prose prose-sm max-w-none">
              <Streamdown>{discussion.message}</Streamdown>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="提出您的問題或修改建議..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSend}
            disabled={!message.trim() || discussMutation.isPending}
            className="flex-1"
          >
            {discussMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                發送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                發送
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const latestUserMessage = discussions
                ?.filter(d => d.role === "user")
                .pop()?.message || "";
              onRegenerateRequest(latestUserMessage);
            }}
          >
            根據討論重新生成
          </Button>
        </div>
      </div>
    </Card>
  );
}
