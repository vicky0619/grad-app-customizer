import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1
            className="text-2xl font-medium text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {APP_TITLE}
          </h1>
          <div className="mt-3 w-8 h-px bg-primary mx-auto" />
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full mb-6 bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="login"
              className="flex-1 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground bg-transparent shadow-none text-sm font-normal"
            >
              登入
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="flex-1 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground bg-transparent shadow-none text-sm font-normal"
            >
              註冊
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate(loginForm);
              }}
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-email"
                  className="label-editorial text-muted-foreground"
                >
                  信箱
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="label-editorial text-muted-foreground"
                >
                  密碼
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  className="bg-background"
                />
              </div>
              {loginMutation.error && (
                <p className="text-sm text-destructive">
                  {loginMutation.error.message}
                </p>
              )}
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "登入中…" : "登入"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                registerMutation.mutate(registerForm);
              }}
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="register-name"
                  className="label-editorial text-muted-foreground"
                >
                  名稱
                </Label>
                <Input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="register-email"
                  className="label-editorial text-muted-foreground"
                >
                  信箱
                </Label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="register-password"
                  className="label-editorial text-muted-foreground"
                >
                  密碼
                  <span className="ml-1 normal-case font-normal">（至少 8 字元）</span>
                </Label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, password: e.target.value }))
                  }
                  minLength={8}
                  required
                  className="bg-background"
                />
              </div>
              {registerMutation.error && (
                <p className="text-sm text-destructive">
                  {registerMutation.error.message}
                </p>
              )}
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "建立中…" : "建立帳號"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
