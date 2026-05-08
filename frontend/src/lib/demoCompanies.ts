import type { Company, Job } from "@/types/domain";

export type DemoCompanyBrand = {
  name: string;
  slug: string;
  domain: string;
  logoUrl: string;
  industry: string;
  signal: string;
};

const localLogoSlugs: Record<string, string> = {
  "google.com": "google",
  "microsoft.com": "microsoft",
  "amazon.com": "amazon",
  "atlassian.com": "atlassian",
  "shopify.com": "shopify",
  "netflix.com": "netflix",
  "datadoghq.com": "datadog",
  "gitlab.com": "gitlab",
  "stripe.com": "stripe",
  "canva.com": "canva",
  "figma.com": "figma",
  "slack.com": "slack"
};

const demoBrands: DemoCompanyBrand[] = [
  brand("Google", "google", "google.com", "Search infrastructure", "Global scale"),
  brand("Microsoft", "microsoft", "microsoft.com", "Cloud platform", "Enterprise"),
  brand("Amazon", "amazon", "amazon.com", "Commerce cloud", "High traffic"),
  brand("Atlassian", "atlassian", "atlassian.com", "Developer tools", "Collaboration"),
  brand("Shopify", "shopify", "shopify.com", "Commerce platform", "Remote-ready"),
  brand("Netflix", "netflix", "netflix.com", "Streaming platform", "Distributed systems"),
  brand("Datadog", "datadog", "datadoghq.com", "Observability", "SRE-heavy"),
  brand("GitLab", "gitlab", "gitlab.com", "DevSecOps", "Async team"),
  brand("Stripe", "stripe", "stripe.com", "Fintech APIs", "Reliability"),
  brand("Canva", "canva", "canva.com", "Creative platform", "Product-led"),
  brand("Figma", "figma", "figma.com", "Design systems", "Collaboration"),
  brand("Slack", "slack", "slack.com", "Work communication", "Workflow automation")
];

function brand(name: string, slug: string, domain: string, industry: string, signal: string): DemoCompanyBrand {
  return {
    name,
    slug,
    domain,
    industry,
    signal,
    logoUrl: logoUrlForDomain(domain)
  };
}

export function brandForJob(job: Pick<Job, "id" | "companyId" | "title">): DemoCompanyBrand {
  return brandForKey(`${job.companyId}-${job.id}-${job.title}`);
}

export function brandForCompany(company: Pick<Company, "name" | "website" | "logoUrl" | "slug">): DemoCompanyBrand {
  const domain = domainFromWebsite(company.website);
  if (domain) {
    return {
      name: company.name,
      slug: domain.replace(/\./g, "-"),
      domain,
      industry: "Hiring team",
      signal: "Employer workspace",
      logoUrl: company.logoUrl || logoUrlForDomain(domain)
    };
  }
  const fallback = brandForKey(company.slug || company.name);
  return {
    ...fallback,
    name: company.name,
    logoUrl: company.logoUrl || fallback.logoUrl
  };
}

function brandForKey(key: string): DemoCompanyBrand {
  const index = Math.abs(hash(key)) % demoBrands.length;
  return demoBrands[index];
}

function hash(value: string) {
  return value.split("").reduce((result, char) => ((result << 5) - result + char.charCodeAt(0)) | 0, 0);
}

function domainFromWebsite(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function logoUrlForDomain(domain: string) {
  const localSlug = localLogoSlugs[domain];
  if (localSlug) {
    return `/company-logos/${localSlug}.png`;
  }
  if (domain.endsWith(".devhire.local")) {
    return "/devhire-mark.svg";
  }
  return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
}
