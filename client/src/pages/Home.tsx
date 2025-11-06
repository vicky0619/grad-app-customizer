import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, FileText, Search, Sparkles, ArrowRight } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{APP_TITLE}</span>
          </div>
          <div>
            {user ? (
              <Link href="/programs">
                <Button>進入應用</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button>登入</Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            智能客製化您的
            <span className="text-primary"> 碩士申請材料</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            基於您之前的申請文件,使用AI搜索最新項目信息,為每個目標項目生成量身定制的CV、SoP和LoR
          </p>
          {user ? (
            <Link href="/programs">
              <Button size="lg" className="gap-2">
                開始使用
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="lg" className="gap-2">
                免費開始
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">上傳原始材料</h3>
            <p className="text-muted-foreground">
              上傳您之前申請其他學校時使用的CV、SoP和LoR,作為客製化的基礎
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI智能研究</h3>
            <p className="text-muted-foreground">
              使用LLM搜索目標項目的最新課程、教職員、要求和特色,確保信息準確
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">生成客製化文檔</h3>
            <p className="text-muted-foreground">
              根據項目特色自動調整您的申請材料,突出相關經驗和技能,提升申請成功率
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">準備好開始了嗎?</h2>
          <p className="text-muted-foreground mb-8">
            立即創建您的第一個項目,讓AI幫您打造完美的申請材料
          </p>
          {user ? (
            <Link href="/programs/new">
              <Button size="lg" className="gap-2">
                創建項目
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="lg" className="gap-2">
                免費註冊
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
