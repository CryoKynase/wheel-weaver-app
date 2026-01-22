export type SeoMetadata = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
};

export const SEO_SITE_URL = "https://www.wheelweaver.com";
export const SEO_SITE_NAME = "Wheel Weaver";
export const SEO_TWITTER_SITE = "";
export const DEFAULT_OG_IMAGE = "/og-image.png";

const HOME_TITLE = "Wheel Weaver | Wheel Lacing Patterns (Schraner Method)";
const HOME_DESCRIPTION =
  "Instant spoke-by-spoke lacing patterns for common rim hole counts. Printable tables, flowcharts, and clear odd/even guidance based on the Schraner method.";

const BUILDER_TITLE = "Wheel Weaver - Spoke Lacing Builder (Schraner Method)";
const BUILDER_DESCRIPTION =
  "Instant spoke-by-spoke lacing table for common hole counts. Clear odd/even steps, heads-in/heads-out guidance, and printable results.";

const FLOW_TITLE = "Wheel Weaver - Lacing Flowchart (Schraner Method)";
const FLOW_DESCRIPTION =
  "A visual flowchart of the full lacing sequence derived from the Schraner method. Designed for use at the truing stand.";

const README_TITLE =
  "Wheel Weaver Help - How the Schraner Lacing Method Works";
const README_DESCRIPTION =
  "Learn the Schraner lacing method and how to use Wheel Weaver's builder and tables. Clear explanations of steps, odd/even sets, and spoke key numbers.";

const ABOUT_TITLE = "About Wheel Weaver";
const ABOUT_DESCRIPTION =
  "Wheel Weaver helps wheel builders lace faster and with fewer mistakes using structured, repeatable spoke sequences.";

const SETTINGS_TITLE = "Wheel Weaver Settings";
const SETTINGS_DESCRIPTION = "Theme, preferences, and app options.";

const PRIVACY_TITLE = "Wheel Weaver Privacy & Cookies";
const PRIVACY_DESCRIPTION =
  "How Wheel Weaver handles analytics cookies and internal traffic preferences.";

function isPositiveNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function builderPath(holes?: number | null) {
  return isPositiveNumber(holes) ? `/builder/${holes}` : "/builder";
}

function flowPath(holes?: number | null) {
  return isPositiveNumber(holes) ? `/flow/${holes}` : "/flow";
}

export function getSeoMetadata({
  pathname,
  holes,
}: {
  pathname: string;
  holes?: number | null;
}): SeoMetadata {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (normalizedPath === "/") {
    return {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: "/",
    };
  }

  if (normalizedPath.startsWith("/builder")) {
    if (isPositiveNumber(holes)) {
      return {
        title: `Wheel Weaver - ${holes}-hole Lacing Pattern Builder`,
        description: `Instant spoke-by-spoke lacing table for ${holes}-hole wheels. Clear odd/even steps, heads-in/heads-out guidance, and printable results.`,
        path: builderPath(holes),
      };
    }
    return {
      title: BUILDER_TITLE,
      description: BUILDER_DESCRIPTION,
      path: builderPath(holes),
    };
  }

  if (normalizedPath.startsWith("/flow")) {
    if (isPositiveNumber(holes)) {
      return {
        title: `Wheel Weaver - Lacing Flowchart for ${holes}-hole Wheels`,
        description: `A visual flowchart of the full lacing sequence for ${holes}-hole wheels, derived from the Schraner method. Designed for use at the truing stand.`,
        path: flowPath(holes),
      };
    }
    return {
      title: FLOW_TITLE,
      description: FLOW_DESCRIPTION,
      path: flowPath(holes),
    };
  }

  if (normalizedPath.startsWith("/readme")) {
    return {
      title: README_TITLE,
      description: README_DESCRIPTION,
      path: "/readme",
    };
  }

  if (normalizedPath.startsWith("/about")) {
    return {
      title: ABOUT_TITLE,
      description: ABOUT_DESCRIPTION,
      path: "/about",
    };
  }

  if (normalizedPath.startsWith("/settings")) {
    return {
      title: SETTINGS_TITLE,
      description: SETTINGS_DESCRIPTION,
      path: "/settings",
      noindex: true,
    };
  }

  if (normalizedPath.startsWith("/privacy")) {
    return {
      title: PRIVACY_TITLE,
      description: PRIVACY_DESCRIPTION,
      path: "/privacy",
      noindex: true,
    };
  }

  return {
    title: "Wheel Weaver - Page not found",
    description: "The Wheel Weaver page you requested could not be found.",
    path: normalizedPath,
    noindex: true,
  };
}

export function getSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Wheel Weaver",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: SEO_SITE_URL,
    description: HOME_DESCRIPTION,
    image: `${SEO_SITE_URL}${DEFAULT_OG_IMAGE}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
  };
}

export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Wheel Weaver",
    url: SEO_SITE_URL,
    description: HOME_DESCRIPTION,
  };
}
