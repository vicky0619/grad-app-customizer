import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const orientationLabels = {
  general: "通用",
  job_hunting: "找工取向",
  employment: "就業取向",
  entrepreneurship: "新創取向",
};

export default function Templates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);

  const [documentType, setDocumentType] = useState<"cv" | "sop" | "lor">("sop");
  const [orientation, setOrientation] = useState<
    "general" | "job_hunting" | "employment" | "entrepreneurship"
  >("general");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本創建成功");
      resetForm();
      setIsDialogOpen(false);
    },
  });
  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本更新成功");
      resetForm();
      setEditingTemplate(null);
    },
  });
  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("範本刪除成功");
    },
  });

  function resetForm() {
    setDocumentType("sop");
    setOrientation("general");
    setName("");
    setContent("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !content) {
      toast.error("請填寫範本名稱和內容");
      return;
    }
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate, name, content });
    } else {
      await createTemplate.mutateAsync({ documentType, orientation, name, content });
    }
  }

  function handleEdit(template: NonNullable<typeof templates>[number]) {
    setEditingTemplate(template.id);
    setDocumentType(template.documentType as "cv" | "sop" | "lor");
    setOrientation(template.orientation as "general" | "job_hunting" | "employment" | "entrepreneurship");
    setName(template.name);
    setContent(template.content);
    setIsDialogOpen(true);
  }

  async function handleDelete(id: number) {
    if (confirm("確定要刪除此範本嗎？")) {
      await deleteTemplate.mutateAsync({ id });
    }
  }

  const grouped = {
    cv: templates?.filter((t) => t.documentType === "cv") ?? [],
    sop: templates?.filter((t) => t.documentType === "sop") ?? [],
    lor: templates?.filter((t) => t.documentType === "lor") ?? [],
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-end justify-between py-8 border-b border-border mb-0">
          <div>
            <p className="label-editorial text-muted-foreground mb-2">文件管理</p>
            <h1
              className="text-3xl font-medium text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              我的模板
            </h1>
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
                setEditingTemplate(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 mb-1">
                <Plus className="h-3.5 w-3.5" />
                新增模板
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle
                  className="text-xl font-medium"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {editingTemplate ? "編輯模板" : "新增模板"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {!editingTemplate && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="docType" className="label-editorial text-muted-foreground">
                        文件類型
                      </Label>
                      <Select value={documentType} onValueChange={(v: "cv" | "sop" | "lor") => setDocumentType(v)}>
                        <SelectTrigger id="docType" className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cv">CV</SelectItem>
                          <SelectItem value="sop">SoP</SelectItem>
                          <SelectItem value="lor">LoR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orientation" className="label-editorial text-muted-foreground">
                        取向標籤
                      </Label>
                      <Select
                        value={orientation}
                        onValueChange={(v: "general" | "job_hunting" | "employment" | "entrepreneurship") =>
                          setOrientation(v)
                        }
                      >
                        <SelectTrigger id="orientation" className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">通用</SelectItem>
                          <SelectItem value="job_hunting">找工取向</SelectItem>
                          <SelectItem value="employment">就業取向</SelectItem>
                          <SelectItem value="entrepreneurship">新創取向</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="tplName" className="label-editorial text-muted-foreground">
                    模板名稱
                  </Label>
                  <Input
                    id="tplName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：我的 SoP — 找工取向"
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tplContent" className="label-editorial text-muted-foreground">
                    模板內容
                  </Label>
                  <Textarea
                    id="tplContent"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="貼上您的文件內容…"
                    rows={14}
                    required
                    className="font-mono text-sm bg-background resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {documentType === "cv" ? "CV 將生成 LaTeX 格式" : "SoP 和 LoR 將生成純文字格式"}
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
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
                    className="flex-1"
                  >
                    {editingTemplate ? "更新模板" : "建立模板"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">載入中…</div>
        ) : !templates || templates.length === 0 ? (
          <div className="py-20 text-center">
            <p
              className="text-2xl font-medium text-foreground mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              尚無模板
            </p>
            <p className="text-muted-foreground mb-8 text-sm">
              建立模板作為 AI 生成文件的基礎
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              建立第一個模板
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="sop">
            <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
              {(["cv", "sop", "lor"] as const).map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="pb-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground bg-transparent shadow-none text-sm font-normal"
                >
                  {type.toUpperCase()}
                  <span className="ml-1.5 label-editorial text-muted-foreground">
                    {grouped[type].length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {(["cv", "sop", "lor"] as const).map((type) => (
              <TabsContent key={type} value={type} className="mt-0">
                {grouped[type].length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    尚無 {type.toUpperCase()} 模板
                  </div>
                ) : (
                  grouped[type].map((template) => (
                    <div
                      key={template.id}
                      className="group py-5 border-b border-border"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="label-editorial text-muted-foreground">
                              {orientationLabels[template.orientation as keyof typeof orientationLabels]}
                            </span>
                            <span className="text-border">·</span>
                            <span className="label-editorial text-muted-foreground">
                              {new Date(template.createdAt).toLocaleDateString("zh-TW", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p
                            className="text-base font-medium text-foreground mb-2"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            {template.name}
                          </p>
                          <pre className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap line-clamp-2">
                            {template.content.substring(0, 160)}
                            {template.content.length > 160 && "…"}
                          </pre>
                        </div>
                        <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
