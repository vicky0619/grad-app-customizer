import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, FileText, Download, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { AdmissionRequirementsDialog } from "@/components/AdmissionRequirementsDialog";

export default function ProgramDetail() {
  const [, params] = useRoute("/programs/:id");
  const programId = parseInt(params?.id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  const [userInstructions, setUserInstructions] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [admissionReqDialogOpen, setAdmissionReqDialogOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<"cv" | "sop" | "lor" | null>(null);

  const { data: program, isLoading: programLoading } = trpc.programs.getById.useQuery(
    { programId },
    { enabled: programId > 0 }
  );

  const { data: research, isLoading: researchLoading, refetch: refetchResearch } = trpc.programs.getResearch.useQuery(
    { programId },
    { enabled: programId > 0 }
  );

  const hasResearch = research !== null && research !== undefined;

  const { data: documents, refetch: refetchDocuments } = trpc.programs.getDocuments.useQuery(
    { programId },
    { enabled: programId > 0 }
  );

  const researchProgram = trpc.programs.researchProgram.useMutation({
    onSuccess: () => {
      toast.success("項目研究完成!");
      refetchResearch();
    },
    onError: () => {
      toast.error("研究失敗,請重試");
    },
  });

  const generateDocument = trpc.programs.generateDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔生成成功!");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "生成失敗,請重試");
    },
  });

  if (programLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">項目不存在</h2>
          <Link href="/programs">
            <Button>返回項目列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    draft: "bg-gray-500",
    researching: "bg-blue-500",
    generating: "bg-yellow-500",
    completed: "bg-green-500",
  };

  const statusLabels = {
    draft: "草稿",
    researching: "研究中",
    generating: "生成中",
    completed: "已完成",
  };

  const getDocumentByType = (type: string) => {
    return documents?.find(d => d.documentType === type);
  };

  const handleResearch = async () => {
    await researchProgram.mutateAsync({ programId });
  };

  const handleGenerate = async (type: "cv" | "sop" | "lor") => {
    setCurrentDocType(type);
    // For SoP, show admission requirements dialog first
    if (type === "sop" && research?.admissionRequirements) {
      setAdmissionReqDialogOpen(true);
    } else {
      setGenerateDialogOpen(true);
    }
  };

  const handleAdmissionReqConfirm = (requirements: any) => {
    // Store requirements for generation
    (window as any).__admissionRequirements = requirements;
    setGenerateDialogOpen(true);
  };

  const confirmGenerate = async () => {
    if (!currentDocType) return;
    const admissionReq = (window as any).__admissionRequirements;
    await generateDocument.mutateAsync({ 
      programId, 
      documentType: currentDocType,
      userInstructions: userInstructions || undefined,
      admissionRequirements: admissionReq || undefined,
    });
    setGenerateDialogOpen(false);
    setUserInstructions("");
    setCurrentDocType(null);
    delete (window as any).__admissionRequirements;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link href="/programs">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回項目列表
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{program.programName}</h1>
              <p className="text-xl text-muted-foreground">
                {program.universityName}
                {program.country && ` · ${program.country}`}
              </p>
            </div>
            <Badge className={statusColors[program.status]}>
              {statusLabels[program.status]}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">概覽</TabsTrigger>
            <TabsTrigger value="research">項目研究</TabsTrigger>
            <TabsTrigger value="documents">生成文檔</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>項目信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-semibold">大學:</span> {program.universityName}
                  </div>
                  <div>
                    <span className="font-semibold">項目:</span> {program.programName}
                  </div>
                  {program.country && (
                    <div>
                      <span className="font-semibold">國家:</span> {program.country}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">創建時間:</span>{" "}
                    {new Date(program.createdAt).toLocaleString('zh-TW')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>已上傳文件</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getDocumentByType("original_cv") && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span>CV - {getDocumentByType("original_cv")?.fileName}</span>
                      </div>
                      <a href={getDocumentByType("original_cv")?.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  )}
                  {getDocumentByType("original_sop") && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span>SoP - {getDocumentByType("original_sop")?.fileName}</span>
                      </div>
                      <a href={getDocumentByType("original_sop")?.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  )}
                  {getDocumentByType("original_lor") && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span>LoR - {getDocumentByType("original_lor")?.fileName}</span>
                      </div>
                      <a href={getDocumentByType("original_lor")?.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="research">
            <Card>
              <CardHeader>
                <CardTitle>項目研究</CardTitle>
                <CardDescription>
                  使用AI搜索最新的項目信息,包括課程、教職員和特色
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasResearch ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">尚未研究此項目</p>
                    <Button
                      onClick={handleResearch}
                      disabled={researchProgram.isPending}
                      size="lg"
                      className="gap-2"
                    >
                      {researchProgram.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          研究中...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          開始研究
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <Button
                        onClick={handleResearch}
                        disabled={researchProgram.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {researchProgram.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            更新中...
                          </>
                        ) : (
                          "重新研究"
                        )}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">課程設置</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.courses || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">教職員</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.facultyMembers || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">入學要求</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.requirements || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">項目特色</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.uniqueCharacteristics || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">研究領域</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.researchAreas || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">項目取向</h3>
                        <div className="prose prose-sm max-w-none">
                          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {research?.programOrientation === "job_hunting" && "💼 找工取向"}
                            {research?.programOrientation === "employment" && "🏭 就業取向"}
                            {research?.programOrientation === "entrepreneurship" && "🚀 新創取向"}
                            {research?.programOrientation === "mixed" && "🌐 混合取向"}
                          </p>
                        </div>
                      </div>

                      {research?.technicalFocus && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">技術方向</h3>
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{research.technicalFocus}</Streamdown>
                          </div>
                        </div>
                      )}

                      {research?.requiredCourses && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">必修課程</h3>
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{research.requiredCourses}</Streamdown>
                          </div>
                        </div>
                      )}

                      {research?.electiveCourses && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">選修課程</h3>
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{research.electiveCourses}</Streamdown>
                          </div>
                        </div>
                      )}

                      {research?.trackOptions && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Track選項</h3>
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{research.trackOptions}</Streamdown>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-semibold mb-2">畢業要求和規劃</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.graduationRequirements || ""}</Streamdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">就業資源</h3>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{research?.careerResources || ""}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid gap-6">
              {["cv", "sop", "lor"].map((type) => {
                const generatedDoc = getDocumentByType(`generated_${type}`);
                const typeLabels = {
                  cv: "CV (Curriculum Vitae)",
                  sop: "Statement of Purpose",
                  lor: "Letter of Recommendation",
                };

                return (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle>{typeLabels[type as keyof typeof typeLabels]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!generatedDoc ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground mb-4">尚未生成此文檔</p>
                          <Button
                            onClick={() => handleGenerate(type as "cv" | "sop" | "lor")}
                            disabled={generateDocument.isPending || !hasResearch}
                            className="gap-2"
                          >
                            {generateDocument.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                生成文檔
                              </>
                            )}
                          </Button>
                          {!hasResearch && (
                            <p className="text-sm text-muted-foreground mt-2">
                              請先完成項目研究
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              生成於 {new Date(generatedDoc.createdAt).toLocaleString('zh-TW')}
                            </span>
                            <div className="flex gap-2">
                              <Link href={`/documents/${generatedDoc.id}`}>
                                <Button variant="default" size="sm">
                                  <FileText className="h-4 w-4 mr-2" />
                                  查看詳情與討論
                                </Button>
                              </Link>
                              <a href={generatedDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  下載
                                </Button>
                              </a>
                              <Button
                                onClick={() => handleGenerate(type as "cv" | "sop" | "lor")}
                                disabled={generateDocument.isPending}
                                variant="outline"
                                size="sm"
                              >
                                重新生成
                              </Button>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg whitespace-pre-wrap">
                            {generatedDoc.content || ""}
                          </div>
                          {generatedDoc.changesLog && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">更動摘要</h4>
                              <div className="space-y-2">
                                {JSON.parse(generatedDoc.changesLog).slice(0, 3).map((change: any, idx: number) => (
                                  <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                                    <span className="font-medium">{change.type}:</span> {change.reason}
                                  </div>
                                ))}
                                <Link href={`/documents/${generatedDoc.id}`}>
                                  <Button variant="link" size="sm" className="p-0 h-auto">
                                    查看完整更動記錄 →
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成 {currentDocType?.toUpperCase()} 文檔</DialogTitle>
            <DialogDescription>
              您可以在下方輸入額外的指示或要求（可選）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="例如：請特別強調AI方向，因為UMD是AI top 2學校..."
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGenerateDialogOpen(false);
                  setUserInstructions("");
                  setCurrentDocType(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={confirmGenerate}
                disabled={generateDocument.isPending}
              >
                {generateDocument.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成文檔
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdmissionRequirementsDialog
        open={admissionReqDialogOpen}
        onOpenChange={setAdmissionReqDialogOpen}
        initialRequirements={research?.admissionRequirements || null}
        onConfirm={handleAdmissionReqConfirm}
      />
    </div>
  );
}
