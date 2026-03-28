import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

const statusLabels: Record<string, string> = {
  draft: "草稿",
  researching: "研究中",
  generating: "生成中",
  completed: "已完成",
};

const statusColors: Record<string, string> = {
  draft: "text-muted-foreground",
  researching: "text-blue-600",
  generating: "text-amber-600",
  completed: "text-primary",
};

export default function Programs() {
  const { user, loading: authLoading } = useAuth();
  const { data: programs, isLoading } = trpc.programs.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-end justify-between py-8 border-b border-border mb-0">
          <div>
            <p className="label-editorial text-muted-foreground mb-2">申請管理</p>
            <h1
              className="text-3xl font-medium text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              我的申請項目
            </h1>
          </div>
          <Link href="/programs/new">
            <Button size="sm" className="gap-1.5 mb-1">
              <Plus className="h-3.5 w-3.5" />
              新建項目
            </Button>
          </Link>
        </div>

        {/* Program list */}
        {!programs || programs.length === 0 ? (
          <div className="py-20 text-center">
            <p
              className="text-2xl font-medium text-foreground mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              尚無申請項目
            </p>
            <p className="text-muted-foreground mb-8 text-sm">
              建立第一個項目，開始準備您的碩士申請材料
            </p>
            <Link href="/programs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建項目
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {programs.map((program, idx) => (
              <Link key={program.id} href={`/programs/${program.id}`}>
                <div
                  className={`group flex items-center justify-between py-5 border-b border-border hover:bg-accent/40 transition-colors px-1 cursor-pointer ${idx === 0 ? "" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className={`label-editorial ${statusColors[program.status]}`}
                      >
                        {statusLabels[program.status]}
                      </span>
                      {program.country && (
                        <>
                          <span className="text-border">·</span>
                          <span className="label-editorial text-muted-foreground">
                            {program.country}
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      className="text-base font-medium text-foreground truncate group-hover:text-primary transition-colors"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {program.programName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {program.universityName}
                    </p>
                  </div>
                  <div className="shrink-0 ml-6 text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(program.createdAt).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm mt-1 block">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
