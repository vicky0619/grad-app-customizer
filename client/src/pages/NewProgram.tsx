import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Link } from "wouter";

export default function NewProgram() {
  const [, setLocation] = useLocation();
  const [universityName, setUniversityName] = useState("");
  const [programName, setProgramName] = useState("");
  const [country, setCountry] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [sopFile, setSopFile] = useState<File | null>(null);
  const [lorFile, setLorFile] = useState<File | null>(null);

  const createProgram = trpc.programs.create.useMutation();
  const uploadDocument = trpc.programs.uploadDocument.useMutation();

  const handleFileChange = (type: 'cv' | 'sop' | 'lor', file: File | null) => {
    if (type === 'cv') setCvFile(file);
    if (type === 'sop') setSopFile(file);
    if (type === 'lor') setLorFile(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!universityName || !programName) {
      toast.error("請填寫大學名稱和項目名稱");
      return;
    }

    if (!cvFile || !sopFile || !lorFile) {
      toast.error("請上傳所有原始文件(CV、SoP、LoR)");
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
        { file: cvFile, type: 'original_cv' as const },
        { file: sopFile, type: 'original_sop' as const },
        { file: lorFile, type: 'original_lor' as const },
      ];

      for (const { file, type } of uploads) {
        const fileContent = await fileToBase64(file);
        await uploadDocument.mutateAsync({
          programId,
          documentType: type,
          fileName: file.name,
          fileContent,
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
      <div className="container py-8 max-w-3xl">
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
              填寫項目信息並上傳您之前的申請材料,我們將幫您客製化適合目標項目的文件
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
                <h3 className="text-lg font-semibold">上傳原始材料</h3>
                <p className="text-sm text-muted-foreground">
                  請上傳您之前申請其他學校時使用的文件,我們將基於這些文件為您生成客製化版本
                </p>

                <div className="space-y-2">
                  <Label htmlFor="cv">CV (Curriculum Vitae) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileChange('cv', e.target.files?.[0] || null)}
                      required
                    />
                    {cvFile && <span className="text-sm text-green-600">✓</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sop">Statement of Purpose *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="sop"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileChange('sop', e.target.files?.[0] || null)}
                      required
                    />
                    {sopFile && <span className="text-sm text-green-600">✓</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lor">Letter of Recommendation *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="lor"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileChange('lor', e.target.files?.[0] || null)}
                      required
                    />
                    {lorFile && <span className="text-sm text-green-600">✓</span>}
                  </div>
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
