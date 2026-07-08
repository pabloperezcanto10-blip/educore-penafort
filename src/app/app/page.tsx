import Image from "next/image";
import Link from "next/link";
import { InstallEduCoreButton } from "@/components/pwa/install-educore-button";

const centers = [
  {
    name: "Colegio Peñafort",
    location: "Alicante",
    href: "/login"
  }
];

export default function EduCoreAppLauncherPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] px-5 py-8 text-[#0F1B2E]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center">
        <div className="w-full rounded-[32px] border border-[#E7EBEE] bg-white/92 p-6 shadow-[0_22px_70px_rgba(15,27,46,0.12)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/brand/educore/logo-vertical.svg"
              alt="EduCore"
              width={260}
              height={260}
              priority
              className="h-auto w-48"
            />
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2F8A70]">
              El corazón de tu centro
            </p>
            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-[#0F1B2E] sm:text-5xl">
              Selecciona tu centro educativo
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4E5B61]">
              Accede a la plataforma de tu colegio desde EduCore.
            </p>
          </div>

          <div className="mt-9 grid gap-4">
            {centers.map((center) => (
              <Link
                href={center.href}
                key={center.name}
                className="group flex flex-col gap-5 rounded-3xl border border-[#E7EBEE] bg-[#F6F3EC]/70 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_55px_rgba(15,27,46,0.10)] sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-4">
                  <Image
                    src="/brand/educore/app-icon-light.svg"
                    alt=""
                    width={512}
                    height={512}
                    className="h-14 w-14 rounded-2xl"
                  />
                  <span>
                    <strong className="block text-lg font-semibold tracking-[-0.03em] text-[#0F1B2E]">
                      {center.name}
                    </strong>
                    <span className="mt-1 block text-sm font-medium text-[#6B737C]">{center.location}</span>
                  </span>
                </span>
                <span className="inline-flex h-11 items-center justify-center rounded-full bg-[#0F1B2E] px-5 text-sm font-semibold text-white transition group-hover:bg-[#1D3045]">
                  Entrar
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
            <InstallEduCoreButton className="inline-flex h-11 items-center justify-center rounded-full border border-[#E7EBEE] bg-white px-5 text-sm font-semibold text-[#0F1B2E] transition hover:-translate-y-0.5" />
            <a
              href="mailto:demo@educore.es"
              className="text-sm font-semibold text-[#2F8A70] underline-offset-4 hover:underline"
            >
              ¿Tu centro aún no usa EduCore? Solicitar demo
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
