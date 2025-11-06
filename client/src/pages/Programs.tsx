import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2, GraduationCap } from "lucide-react";
import { Link } from "wouter";

export default function Programs() {
  const { user, loading: authLoading } = useAuth();
  const { data: programs, isLoading } = trpc.programs.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">我的申請項目</h1>
            <p className="text-muted-foreground">管理您的碩士項目申請材料</p>
          </div>
          <Link href="/programs/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              新建項目
            </Button>
          </Link>
        </div>

        {!programs || programs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">還沒有項目</h3>
              <p className="text-muted-foreground mb-6">創建您的第一個申請項目開始使用</p>
              <Link href="/programs/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建項目
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Link key={program.id} href={`/programs/${program.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={statusColors[program.status]}>
                        {statusLabels[program.status]}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{program.programName}</CardTitle>
                    <CardDescription className="text-base">
                      {program.universityName}
                      {program.country && ` · ${program.country}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      創建於 {new Date(program.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
