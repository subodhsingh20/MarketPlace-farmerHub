import { Link } from "react-router-dom";

function InfoPage({
  eyebrow,
  title,
  description,
  sections,
  primaryAction,
  secondaryAction,
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(16,24,40,0.08)]">
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-lime-500 px-6 py-12 text-white sm:px-8 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50 sm:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {primaryAction ? (
              <Link
                to={primaryAction.to}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50"
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-12">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-emerald-50/40 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default InfoPage;
