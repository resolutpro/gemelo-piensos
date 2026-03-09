import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, Eye, EyeOff, Loader2, Package, Wifi, FlaskConical, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(2, "Mínimo 2 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nombre obligatorio"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Mínimo 3 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

function PasswordStrength({ password }: { password: string }) {
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
    : 3;

  const labels = ["", "Débil", "Regular", "Buena", "Excelente"];
  const colors = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? colors[strength] : "bg-border"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Seguridad: <span className="font-medium">{labels[strength]}</span></p>
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  if (user) {
    navigate("/");
    return null;
  }

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", username: "", password: "", confirmPassword: "" } });

  const handleLogin = loginForm.handleSubmit((data) => {
    loginMutation.mutate(data);
  });

  const handleRegister = registerForm.handleSubmit((data) => {
    const { confirmPassword, ...rest } = data;
    registerMutation.mutate(rest as any);
  });

  const watchedPassword = registerForm.watch("password");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column - Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-md">
              <Cpu className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Shadow Pilot</h1>
            <p className="text-sm text-muted-foreground">Plataforma de Control Industrial</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {mode === "login" ? "Acceso al Sistema" : "Crear Cuenta"}
              </CardTitle>
              <CardDescription>
                {mode === "login" ? "Ingrese sus credenciales para continuar" : "Regístrese para comenzar a pilotar el sistema"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Usuario</Label>
                    <Input
                      id="login-username"
                      placeholder="nombre_usuario"
                      data-testid="input-username"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        data-testid="input-password"
                        {...loginForm.register("password")}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login">
                    {loginMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando sesión...</> : "Iniciar Sesión"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    ¿No tiene cuenta?{" "}
                    <button type="button" onClick={() => setMode("register")} className="text-primary font-medium">
                      Crear una cuenta nueva
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nombre Completo</Label>
                    <Input id="reg-name" placeholder="Ej. Juan Pérez" data-testid="input-name" {...registerForm.register("name")} />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" placeholder="correo@empresa.com" data-testid="input-email" {...registerForm.register("email")} />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Nombre de Usuario</Label>
                    <Input id="reg-username" placeholder="usuario123" data-testid="input-register-username" {...registerForm.register("username")} />
                    {registerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Contraseña</Label>
                      <Input id="reg-password" type="password" placeholder="••••••••" data-testid="input-register-password" {...registerForm.register("password")} />
                      {registerForm.formState.errors.password && (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirmar</Label>
                      <Input id="reg-confirm" type="password" placeholder="••••••••" data-testid="input-confirm-password" {...registerForm.register("confirmPassword")} />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                  {watchedPassword && <PasswordStrength password={watchedPassword} />}
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
                    {registerMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</> : "Registrar Usuario"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    ¿Ya tiene cuenta?{" "}
                    <button type="button" onClick={() => setMode("login")} className="text-primary font-medium">
                      Iniciar sesión
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            © 2024 Shadow Pilot Industrial Systems. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right column - Hero */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-sidebar p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="absolute border border-sidebar-foreground rounded-full"
              style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="relative z-10 max-w-md text-center space-y-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mx-auto shadow-lg">
            <Cpu className="w-9 h-9 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-sidebar-foreground mb-3">Gemelo Digital Industrial</h2>
            <p className="text-sidebar-foreground/60 leading-relaxed">
              Plataforma de digitalización para fábricas de piensos. Control de calidad, sensores IoT y simulación de mezclas en tiempo real.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: Package, title: "Recepción NIR", desc: "Análisis de materias primas en entrada" },
              { icon: Wifi, title: "Sensores IoT", desc: "Monitorización ambiental por zonas" },
              { icon: FlaskConical, title: "Simulaciones", desc: "Predicción nutricional de mezclas" },
              { icon: ShieldCheck, title: "Trazabilidad", desc: "Seguimiento completo del lote" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-sidebar-accent">
                <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">{title}</p>
                  <p className="text-xs text-sidebar-foreground/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
