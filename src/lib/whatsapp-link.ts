/** A wa.me link to a number (digits only) with a prefilled message. Used on the server and in the page. */
export const whatsappHref = (number: string, message: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
