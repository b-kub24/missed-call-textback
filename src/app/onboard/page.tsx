import Header from "@/components/Header";
import ClientForm from "@/components/ClientForm";

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Onboard New Client
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up a new business for missed-call text-back automation. Make
            sure you have already provisioned a Twilio number for this client.
          </p>
        </div>

        {/* Setup checklist */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-brand-800 mb-3">
            Before you start, make sure you have:
          </h3>
          <ul className="space-y-2">
            {[
              "A Twilio phone number provisioned for this client",
              "The business owner's phone number (for reply forwarding)",
              "The client's booking link (Calendly, Square, etc.)",
              "Their business hours and timezone",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-brand-700">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <ClientForm mode="create" />
      </main>
    </div>
  );
}
