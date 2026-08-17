import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">VIAO</h1>
      <p className="text-muted-foreground text-sm">
        Base de UI (Tailwind CSS + shadcn/ui) configurada correctamente.
      </p>
      <Button>Componente de prueba (shadcn/ui)</Button>
    </main>
  );
}
