import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function NewProgram() {
  const [, setLocation] = useLocation();
  const [universityName, setUniversityName] = useState("");
  const [programName, setProgramName] = useState("");
  const [country, setCountry] = useState("");

  const createProgram = trpc.programs.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!universityName || !programName) {
      toast.error("請填寫大學名稱和項目名稱");
      return;
    }

    try {
      const result = await createProgram.mutateAsync({
        universityName,
        programName,
        country: country || undefined,
      });

      const programId = result.programId;
      toast.success("項目創建成功!");
      setLocation(`/programs/${programId}`);
    } catch (error) {
      toast.error("創建項目失敗,請重試");
      console.error(error);
    }
  };

  const isLoading = createProgram.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container max-w-3xl py-12">
        <Button
          variant="ghost"
          onClick={() => setLocation("/programs")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回項目列表
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">創建新項目</CardTitle>
                <CardDescription className="text-blue-100">
                  填寫目標校系信息,開始客製化您的申請材料
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="universityName">大學名稱 *</Label>
                  <Input
                    id="universityName"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="例如: Stanford University"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programName">項目名稱 *</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="例如: Master of Science in Computer Science"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">國家/地區 (可選)</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="例如: United States"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>提示:</strong> 創建項目後,您可以:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>使用AI搜索項目的詳細信息(課程、教職員、要求等)</li>
                  <li>基於您在範本管理中上傳的範本生成客製化文檔</li>
                  <li>下載生成的CV(LaTeX)、SoP和LoR文檔</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/programs")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isLoading ? "創建中..." : "創建項目"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
