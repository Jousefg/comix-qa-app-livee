import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { AppProvider } from "@shopify/polaris"; // İŞTE BU EKSİKTİ
import translations from "@shopify/polaris/locales/en.json"; // BU DA DİL AYARI
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  // Remix'teki json() yerine direkt obje dönüyoruz
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <ShopifyAppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/additional">Additional page</Link>
      </NavMenu>
      
      {/* Polaris Bileşenleri çalışsın diye buraya ekledik */}
      <AppProvider i18n={translations}>
        <Outlet />
      </AppProvider>
      
    </ShopifyAppProvider>
  );
}

// Hata yakalama fonksiyonları (Standart)
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};