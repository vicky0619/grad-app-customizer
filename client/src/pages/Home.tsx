import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <span
            className="font-semibold tracking-tight text-foreground cursor-pointer"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            onClick={() => setLocation("/")}
          >
            {APP_TITLE}
          </span>
          <nav className="flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-normal"
                  onClick={() => setLocation("/templates")}
                >
                  範本
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-normal"
                  onClick={() => setLocation("/programs")}
                >
                  項目
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-normal text-muted-foreground"
                  onClick={logout}
                >
                  登出
                </Button>
                <Button
                  size="sm"
                  className="ml-2 text-sm"
                  onClick={() => setLocation("/programs")}
                >
                  開啟主頁
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => (setLocation(getLoginUrl()))}
              >
                進入帳號
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="container py-24 md:py-32">
            <div className="max-w-2xl">
              <p className="label-editorial text-muted-foreground mb-6">
                AI 申請文件助手
              </p>
              <h1
                className="text-5xl md:text-6xl font-medium leading-tight text-foreground mb-8"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                量身定製的
                <br />
                <em className="not-italic text-primary">碩士申請</em>
                <br />
                文件
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                基於您的原始申請材料，AI 自動研究目標項目特色，為每所學校生成專屬的 CV、SoP 和 LoR。
              </p>
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  className="px-8"
                  onClick={() =>
                    isAuthenticated
                      ? setLocation("/programs")
                      : (setLocation(getLoginUrl()))
                  }
                >
                  開始使用
                </Button>
                <span className="text-sm text-muted-foreground">免費，無需信用卡</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border">
          <div className="container py-16">
            <p className="label-editorial text-muted-foreground mb-12">
              工作流程
            </p>
            <div className="grid md:grid-cols-3 gap-0">
              {[
                {
                  step: "01",
                  title: "上傳原始材料",
                  desc: "上傳您以往申請使用的 CV、SoP 和 LoR，作為客製化的基礎範本。",
                },
                {
                  step: "02",
                  title: "AI 智能研究",
                  desc: "系統自動搜尋目標項目的課程、師資、入學要求與特色，確保資料最新。",
                },
                {
                  step: "03",
                  title: "生成客製文件",
                  desc: "根據項目特色調整申請材料，突出相關經歷，並提供完整修改記錄。",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={`py-8 ${i > 0 ? "md:border-l border-border md:pl-8" : ""} ${i < 2 ? "md:pr-8" : ""}`}
                >
                  <span className="label-editorial text-primary mb-4 block">
                    {item.step}
                  </span>
                  <h3
                    className="text-xl font-medium text-foreground mb-3"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="container py-20">
            <div className="max-w-xl">
              <h2
                className="text-3xl font-medium text-foreground mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                準備好開始了嗎？
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                立即創建您的第一個申請項目，讓 AI 協助您完成專屬的申請材料。
              </p>
              <Button
                size="lg"
                onClick={() =>
                  isAuthenticated
                    ? setLocation("/programs/new")
                    : (setLocation(getLoginUrl()))
                }
              >
                創建第一個項目
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Vicky Tsai
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                © {new Date().getFullYear()} {APP_TITLE}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <a
                href="https://www.linkedin.com/in/wen-chi-tsai/"
                target="_blank"
                rel="noopener noreferrer"
                className="label-editorial text-muted-foreground hover:text-foreground transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="https://www.instagram.com/wenchi_tsai/"
                target="_blank"
                rel="noopener noreferrer"
                className="label-editorial text-muted-foreground hover:text-foreground transition-colors"
              >
                Instagram
              </a>
              <a
                href="mailto:vicky46586038@gmail.com"
                className="label-editorial text-muted-foreground hover:text-foreground transition-colors"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
