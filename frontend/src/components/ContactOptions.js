import { Link } from "react-router-dom";

const getPhoneLinks = (phone) => {
  const sanitizedPhone = (phone || "").replace(/[^\d+]/g, "");

  return {
    tel: `tel:${sanitizedPhone}`,
    whatsapp: `https://wa.me/${sanitizedPhone.replace(/^\+/, "")}`,
  };
};

function ContactOptions({
  farmerId,
  farmerName,
  phone,
  orderId,
  compact = false,
  chatLabel = "Chat with Farmer",
}) {
  if (!farmerId) {
    return null;
  }

  const links = getPhoneLinks(phone);
  const params = new URLSearchParams({
    user: farmerId,
    name: farmerName || "Farmer",
  });

  if (orderId) {
    params.set("order", orderId);
  }

  const baseButtonClass =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300";
  const compactSizeClass = compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm";

  return (
    <div className="space-y-3">
      <Link
        to={`/chat?${params.toString()}`}
        className={`${baseButtonClass} ${compactSizeClass} w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md hover:from-emerald-700 hover:to-green-700 hover:shadow-lg`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
        </svg>
        {chatLabel}
      </Link>

      {phone && (
        <div className="grid grid-cols-2 gap-3">
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} ${compactSizeClass} bg-green-500 text-white shadow-sm hover:bg-green-600`}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.52 3.48A11.86 11.86 0 0012.08 0C5.56 0 .24 5.3.24 11.82c0 2.08.54 4.12 1.56 5.93L0 24l6.43-1.69a11.79 11.79 0 005.65 1.44h.01c6.52 0 11.84-5.3 11.84-11.82 0-3.15-1.23-6.12-3.41-8.45zm-8.44 18.27h-.01a9.85 9.85 0 01-5.02-1.37l-.36-.21-3.82 1 1.02-3.72-.23-.38a9.8 9.8 0 01-1.5-5.24C2.16 6.4 6.63 1.93 12.08 1.93c2.63 0 5.1 1.03 6.96 2.89a9.77 9.77 0 012.88 6.97c0 5.44-4.47 9.96-9.84 9.96zm5.4-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.19.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.77-1.64-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.91-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.91 1.22 3.11c.15.2 2.09 3.18 5.06 4.46.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.69.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z" />
            </svg>
            WhatsApp
          </a>

          <a
            href={links.tel}
            className={`${baseButtonClass} ${compactSizeClass} bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200`}
          >
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a2 2 0 011.94 1.515l.607 2.429a2 2 0 01-.55 1.964l-1.27 1.27a16.042 16.042 0 006.546 6.546l1.27-1.27a2 2 0 011.964-.55l2.43.607A2 2 0 0119.72 19H19a2 2 0 01-2 2h-1C8.82 21 3 15.18 3 8V5z" />
            </svg>
            Call
          </a>
        </div>
      )}
    </div>
  );
}

export default ContactOptions;
