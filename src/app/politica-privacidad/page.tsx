import type { Metadata } from "next";
import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Política de Privacidad | ${SITE_NAME}`,
  description: "Información sobre el tratamiento de datos enviados a través del formulario de contacto de EducaCora.",
  alternates: {
    canonical: "/politica-privacidad"
  }
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] px-5 py-8 text-[#0F1B2E]">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-[#E7EBEE] bg-white p-6 shadow-[0_20px_70px_rgba(15,27,46,0.10)] sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#2E7D5A] underline-offset-4 hover:underline">
          ← Volver a EducaCora
        </Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#2E7D5A]">Privacidad</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Política de Privacidad</h1>
        <p className="mt-4 text-base leading-7 text-[#4E5B61]">
          Esta página resume cómo tratamos los datos enviados a través del formulario de contacto comercial de EducaCora.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#4E5B61]">
          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Datos que puedes enviarnos</h2>
            <p className="mt-2">
              El formulario puede solicitar nombre, correo electrónico, centro educativo, cargo o relación con el centro, teléfono, localidad y un mensaje opcional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Finalidad</h2>
            <p className="mt-2">
              Usamos estos datos únicamente para responder a tu solicitud, entender el contexto del centro y organizar una conversación comercial o informativa si procede.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Base y conservación</h2>
            <p className="mt-2">
              El tratamiento se basa en tu consentimiento al enviar el formulario. Conservaremos la información durante el tiempo necesario para gestionar la solicitud y las comunicaciones derivadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Servicios técnicos</h2>
            <p className="mt-2">
              Para proteger el formulario usamos Cloudflare Turnstile. Para enviar el correo de contacto usamos Resend. No vendemos tus datos ni los usamos para crear cuentas automáticamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Tus derechos</h2>
            <p className="mt-2">
              Puedes solicitar información, rectificación o eliminación de los datos enviados escribiendo a{" "}
              <a className="font-semibold text-[#2E7D5A] underline-offset-4 hover:underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F1B2E]">Contacto</h2>
            <p className="mt-2">
              Para cualquier consulta relacionada con privacidad o con el formulario de contacto, escribe a{" "}
              <a className="font-semibold text-[#2E7D5A] underline-offset-4 hover:underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
