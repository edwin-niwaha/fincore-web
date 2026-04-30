export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}
