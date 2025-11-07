import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Link } from "wouter";

export default function NewProgram() {
  const [, setLocation] = useLocation();
  const [universityName, setUniversityName] = useState("");
  const [programName, setProgramName] = useState("");
  const [country, setCountry] = useState("");
  const [cvText, setCvText] = useState("");
  const [sopText, setSopText] = useState("");
  const [lorText, setLorText] = useState("");

  const createProgram = trpc.programs.create.useMutation();
  const uploadDocument = trpc.programs.uploadDocument.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!universityName || !programName) {
      toast.error("請填寫大學名稱和項目名稱");
      return;
    }

    if (!cvText || !sopText || !lorText) {
      toast.error("請填寫所有原始文件內容(CV、SoP、LoR)");
      return;
    }

    try {
      const result = await createProgram.mutateAsync({
        universityName,
        programName,
        country: country || undefined,
      });

      const programId = result.programId;

      // Upload documents
      const uploads = [
        { text: cvText, type: 'original_cv' as const },
        { text: sopText, type: 'original_sop' as const },
        { text: lorText, type: 'original_lor' as const },
      ];

      for (const { text, type } of uploads) {
        await uploadDocument.mutateAsync({
          programId,
          documentType: type,
          textContent: text,
        });
      }

      toast.success("項目創建成功!");
      setLocation(`/programs/${programId}`);
    } catch (error) {
      toast.error("創建項目失敗,請重試");
      console.error(error);
    }
  };

  const isLoading = createProgram.isPending || uploadDocument.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl">
        <Link href="/programs">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回項目列表
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">新建申請項目</CardTitle>
            <CardDescription>
              填寫項目信息並輸入您之前的申請材料文字內容,我們將幫您客製化適合目標項目的文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">項目信息</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="universityName">大學名稱 *</Label>
                  <Input
                    id="universityName"
                    placeholder="例如: Stanford University"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programName">項目名稱 *</Label>
                  <Input
                    id="programName"
                    placeholder="例如: Master of Science in Computer Science"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">國家/地區</Label>
                  <Input
                    id="country"
                    placeholder="例如: United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">原始申請材料</h3>
                <p className="text-sm text-muted-foreground">
                  請輸入您之前申請其他學校時使用的文字內容,我們將基於這些文件為您生成客製化版本
                </p>

                <div className="space-y-2">
                  <Label htmlFor="cv">CV (Curriculum Vitae) *</Label>
                  <Textarea
                    id="cv"
                    placeholder="請輸入您的CV文字內容..."
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    required
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {cvText.length} 字符
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sop">Statement of Purpose *</Label>
                  <Textarea
                    id="sop"
                    placeholder="請輸入您的SoP文字內容..."
                    value={sopText}
                    onChange={(e) => setSopText(e.target.value)}
                    required
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {sopText.length} 字符
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lor">Letter of Recommendation *</Label>
                  <Textarea
                    id="lor"
                    placeholder="請輸入您的LoR文字內容..."
                    value={lorText}
                    onChange={(e) => setLorText(e.target.value)}
                    required
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {lorText.length} 字符
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      創建中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      創建項目
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
