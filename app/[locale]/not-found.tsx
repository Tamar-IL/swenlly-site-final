import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="ctasection" style={{ marginTop: 120 }}>
        <h2>404 · הדף לא נמצא</h2>
        <p>נראה שהקישור שבור או שהדף הוסר.</p>
        <div className="ctarow">
          <Link className="pill pill-w" href="/he">
            חזרה לבית →
          </Link>
        </div>
      </div>
    </div>
  );
}
