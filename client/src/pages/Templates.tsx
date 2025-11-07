import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, FileText, Briefcase, Rocket, Globe } from "lucide-react";

export default function Templates() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  
  const [documentType, setDocumentType] = useState<"cv" | "sop" | "lor">("sop");
  const [orientation, setOrientation] = useState<"general" | "job_hunting" | "employment" | "entrepreneurship">("general");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本創建成功!");
      resetForm();
      setIsCreateDialogOpen(false);
    },
  });
  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本更新成功!");
      resetForm();
      setEditingTemplate(null);
    },
  });
  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本刪除成功!");
    },
  });

  const resetForm = () => {
    setDocumentType("sop");
    setOrientation("general");
    setName("");
    setContent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !content) {
      toast.error("請填寫範本名稱和內容");
      return;
    }

    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate,
        name,
        content,
      });
    } else {
      await createTemplate.mutateAsync({
        documentType,
        orientation,
        name,
        content,
      });
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template.id);
    setDocumentType(template.documentType);
    setOrientation(template.orientation);
    setName(template.name);
    setContent(template.content);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("確定要刪除此範本嗎?")) {
      await deleteTemplate.mutateAsync({ id });
    }
  };

  const orientationLabels = {
    general: "通用",
    job_hunting: "找工取向",
    employment: "就業取向",
    entrepreneurship: "新創取向",
  };

  const orientationIcons = {
    general: Globe,
    job_hunting: Briefcase,
    employment: FileText,
    entrepreneurship: Rocket,
  };

  const groupedTemplates = {
    cv: templates?.filter(t => t.documentType === "cv") || [],
    sop: templates?.filter(t => t.documentType === "sop") || [],
    lor: templates?.filter(t => t.documentType === "lor") || [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container max-w-6xl py-12">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首頁
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingTemplate(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                新增範本
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "編輯範本" : "新增範本"}</DialogTitle>
                <DialogDescription>
                  {editingTemplate ? "修改範本內容" : "創建新的文檔範本,用於生成客製化申請材料"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingTemplate && (
                  <>
                    <div className="space-y-2">
                      <Label>文檔類型</Label>
                      <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cv">CV (Curriculum Vitae)</SelectItem>
                          <SelectItem value="sop">SoP (Statement of Purpose)</SelectItem>
                          <SelectItem value="lor">LoR (Letter of Recommendation)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>取向標籤</Label>
                      <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">通用</SelectItem>
                          <SelectItem value="job_hunting">找工取向</SelectItem>
                          <SelectItem value="employment">就業取向</SelectItem>
                          <SelectItem value="entrepreneurship">新創取向</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {documentType === "sop" ? "AI會根據項目取向自動選擇最適合的SoP範本" : "CV和LoR建議使用通用取向"}
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">範本名稱</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: 我的SoP - 找工取向"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">範本內容</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="貼上您的文檔內容..."
                    rows={15}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {documentType === "cv" ? "CV將生成LaTeX格式" : "SoP和LoR將生成純文字格式"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                      setEditingTemplate(null);
                    }}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTemplate.isPending || updateTemplate.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {editingTemplate ? "更新" : "創建"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">範本管理</CardTitle>
            <CardDescription className="text-blue-100">
              管理您的申請文檔範本,用於生成客製化的CV、SoP和LoR
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加載中...</div>
            ) : templates && templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">還沒有範本</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  創建第一個範本
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="sop" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cv">CV ({groupedTemplates.cv.length})</TabsTrigger>
                  <TabsTrigger value="sop">SoP ({groupedTemplates.sop.length})</TabsTrigger>
                  <TabsTrigger value="lor">LoR ({groupedTemplates.lor.length})</TabsTrigger>
                </TabsList>

                {(["cv", "sop", "lor"] as const).map((type) => (
                  <TabsContent key={type} value={type} className="space-y-4">
                    {groupedTemplates[type].length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        沒有{type.toUpperCase()}範本
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {groupedTemplates[type].map((template) => {
                          const Icon = orientationIcons[template.orientation as keyof typeof orientationIcons];
                          return (
                            <Card key={template.id} className="hover:shadow-md transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-blue-600" />
                                    <div>
                                      <CardTitle className="text-lg">{template.name}</CardTitle>
                                      <CardDescription>
                                        {orientationLabels[template.orientation as keyof typeof orientationLabels]} · 
                                        {new Date(template.createdAt).toLocaleDateString('zh-TW')}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(template)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(template.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                                  <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                                    {template.content.substring(0, 300)}
                                    {template.content.length > 300 && "..."}
                                  </pre>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
