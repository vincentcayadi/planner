export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Link not found or expired</h1>
        <p className="text-neutral-600 mt-2">
          The shared day might have been deleted or timed out.
        </p>
      </div>
    </div>
  );
}
