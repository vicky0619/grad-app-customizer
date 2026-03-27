import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, APP_LOGO } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", name: "" });

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src={APP_LOGO} alt={APP_TITLE} className="w-12 h-12 rounded-lg" />
          <h1 className="text-xl font-semibold">{APP_TITLE}</h1>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">登入</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">註冊</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">登入帳號</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={e => {
                    e.preventDefault();
                    loginMutation.mutate(loginForm);
                  }}
                >
                  <div className="space-y-1">
                    <Label htmlFor="login-email">信箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password">密碼</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                  {loginMutation.error && (
                    <p className="text-sm text-destructive">{loginMutation.error.message}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "登入中..." : "登入"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">建立帳號</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={e => {
                    e.preventDefault();
                    registerMutation.mutate(registerForm);
                  }}
                >
                  <div className="space-y-1">
                    <Label htmlFor="register-name">名稱</Label>
                    <Input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      value={registerForm.name}
                      onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="register-email">信箱</Label>
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      value={registerForm.email}
                      onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="register-password">密碼（至少 8 字元）</Label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </div>
                  {registerMutation.error && (
                    <p className="text-sm text-destructive">{registerMutation.error.message}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "建立中..." : "建立帳號"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
