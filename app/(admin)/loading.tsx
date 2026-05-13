export default function Loading() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="h-4 w-16 rounded-[4px] bg-gray-100" />
        <div className="h-8 w-52 rounded-[4px] bg-gray-100" />
        <div className="h-5 w-[520px] rounded-[4px] bg-gray-100" />
      </div>
      <div className="flex gap-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-[116px] w-[250px] rounded-[10px] border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="h-[260px] rounded-[10px] border border-gray-200 bg-gray-50" />
    </div>
  );
}
