import Providers from "../src/components/Providers";

export const metadata = {
  title: "Notification Inbox",
  description: "Stage 7 notification frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
