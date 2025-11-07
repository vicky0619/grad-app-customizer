import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Library } from "lucide-react";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

export default function Home() {
  const [, setLocation] = useLocation();
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" onClick={() => setLocation("/templates")}>
                  <Library className="mr-2 h-4 w-4" />
                  範本管理
                </Button>
                <Button variant="ghost" onClick={() => setLocation("/programs")}>
                  <FileText className="mr-2 h-4 w-4" />
                  我的項目
                </Button>
                <Button variant="outline" onClick={logout}>
                  登出
                </Button>
              </>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()}>
                進入帳號
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container py-20">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              智能客製化您的 碩士申請材料
            </h1>
            <p className="text-xl text-gray-600">
              基於您之前的申請文件,使用AI搜索最新項目信息,為每個目標項目生成量身定製的CV、SoP和LoR
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
              onClick={() => isAuthenticated ? setLocation("/programs") : window.location.href = getLoginUrl()}
            >
              開始使用 →
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Library className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">上傳原始材料</h3>
              <p className="text-gray-600">
                上傳您之前申請其他校系使用的CV、SoP和LoR,作為客製化的基礎
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI智能研究</h3>
              <p className="text-gray-600">
                使用LLM搜索目標項目的最新課程、教職員、要求和特色,確保信息準確
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">生成客製化文檔</h3>
              <p className="text-gray-600">
                根據項目特色自動調整您的申請材料,突出相關經驗和技能,提升申請成功率
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">準備好開始了嗎?</h2>
            <p className="text-gray-600 mb-6">
              立即創建您的第一個項目,讓AI幫您完成客製化的申請材料!
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => isAuthenticated ? setLocation("/programs/new") : window.location.href = getLoginUrl()}
            >
              創建項目 →
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
