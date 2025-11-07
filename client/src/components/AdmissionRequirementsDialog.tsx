import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface Question {
  question: string;
  wordLimit: number;
}

interface AdmissionRequirements {
  documentType: "sop" | "personal_statement" | "essay_questions";
  wordLimit?: number;
  questions?: Question[];
}

interface AdmissionRequirementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRequirements: string | null;
  onConfirm: (requirements: AdmissionRequirements) => void;
}

export function AdmissionRequirementsDialog({
  open,
  onOpenChange,
  initialRequirements,
  onConfirm,
}: AdmissionRequirementsDialogProps) {
  const [documentType, setDocumentType] = useState<"sop" | "personal_statement" | "essay_questions">("sop");
  const [wordLimit, setWordLimit] = useState(1000);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (initialRequirements) {
      try {
        const parsed = JSON.parse(initialRequirements);
        setDocumentType(parsed.documentType || "sop");
        setWordLimit(parsed.wordLimit || 1000);
        setQuestions(parsed.questions || []);
      } catch (e) {
        // Use defaults
      }
    }
  }, [initialRequirements]);

  const addQuestion = () => {
    setQuestions([...questions, { question: "", wordLimit: 500 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleConfirm = () => {
    const requirements: AdmissionRequirements = {
      documentType,
      ...(documentType === "essay_questions"
        ? { questions }
        : { wordLimit }),
    };
    onConfirm(requirements);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>確認申請文件要求</DialogTitle>
          <DialogDescription>
            請確認或修改該項目的申請文件要求。如果系統搜索的信息不完整,您可以補充具體問題。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>文件類型</Label>
            <select
              className="w-full p-2 border rounded-md"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
            >
              <option value="sop">Statement of Purpose (標準SoP)</option>
              <option value="personal_statement">Personal Statement</option>
              <option value="essay_questions">Essay Questions (多個問題)</option>
            </select>
          </div>

          {documentType !== "essay_questions" ? (
            <div className="space-y-2">
              <Label>字數限制</Label>
              <Input
                type="number"
                value={wordLimit}
                onChange={(e) => setWordLimit(parseInt(e.target.value))}
                placeholder="例如: 1000"
              />
              <p className="text-sm text-gray-500">
                如果沒有明確限制,建議使用1000字±100
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Essay Questions</Label>
                <Button onClick={addQuestion} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  添加問題
                </Button>
              </div>

              {questions.map((q, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Label>問題 {index + 1}</Label>
                      <Button
                        onClick={() => removeQuestion(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(index, "question", e.target.value)}
                      placeholder="輸入問題內容..."
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap">字數限制:</Label>
                      <Input
                        type="number"
                        value={q.wordLimit}
                        onChange={(e) => updateQuestion(index, "wordLimit", parseInt(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  點擊上方按鈕添加問題
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleConfirm}>
              確認並繼續生成
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
