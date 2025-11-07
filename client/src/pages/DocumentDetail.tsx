import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentDiscussion } from "@/components/DocumentDiscussion";
import { toast } from "sonner";

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const documentId = params?.id ? parseInt(params.id) : 0;

  const { data: document, isLoading } = trpc.programs.getDocument.useQuery(
    { documentId },
    { enabled: documentId > 0 }
  );

  const generateMutation = trpc.programs.generateDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔已重新生成");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">文檔不存在</h2>
          <Link href="/programs">
            <Button>返回項目列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  const changes = document.changesLog ? JSON.parse(document.changesLog) : [];
  const originalTemplate = ""; // Will be fetched from template

  const handleRegenerateRequest = (feedback: string) => {
    if (!document) return;
    
    const documentType = document.documentType.replace("generated_", "") as "cv" | "sop" | "lor";
    generateMutation.mutate({
      programId: document.programId,
      documentType,
      userInstructions: feedback,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href={`/programs/${document.programId}`}>
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回項目
            </Button>
          </Link>
          <div className="flex gap-2">
            <a href={document.fileUrl} download>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                下載文檔
              </Button>
            </a>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{document.fileName}</h1>
          <p className="text-gray-600">
            文檔類型: {document.documentType.replace("generated_", "").toUpperCase()}
          </p>
        </div>

        <div className="space-y-6">
          {document.content && (
            <DocumentViewer
              originalTemplate={originalTemplate}
              customizedDocument={document.content}
              changes={changes}
            />
          )}

          <DocumentDiscussion
            documentId={documentId}
            onRegenerateRequest={handleRegenerateRequest}
          />
        </div>
      </div>
    </div>
  );
}
