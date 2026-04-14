export default function BicyclesLayout({
  children,
  drawer
}: Readonly<{
  children: React.ReactNode;
  drawer: React.ReactNode;
}>) {
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
