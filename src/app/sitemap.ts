import path from 'node:path';

import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@src/i18n/config';
import type { SitemapPagesFieldsFragment } from '@src/lib/__generated/sdk';
import { client } from '@src/lib/client';

type SitemapFieldsWithoutTypename = Omit<SitemapPagesFieldsFragment, '__typename'>;
type SitemapPageCollection = SitemapFieldsWithoutTypename[keyof SitemapFieldsWithoutTypename];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get base URL from environment variables with fallback
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000';

  const promises =
    locales?.map(locale => client.sitemapPages({ locale })).filter(page => Boolean(page)) || [];
  const dataPerLocale: SitemapFieldsWithoutTypename[] = await Promise.all(promises);
  const fields = dataPerLocale
    .flatMap((localeData, index) =>
      Object.values(localeData).flatMap((pageCollection: SitemapPageCollection) =>
        pageCollection?.items.map(item => {
          const localeForUrl = locales?.[index] === defaultLocale ? undefined : locales?.[index];
          
          try {
            const url = new URL(
              path.join(localeForUrl || '', item?.slug || ''),
              baseUrl,
            ).toString();

            return item && !item.seoFields?.excludeFromSitemap
              ? {
                  lastModified: item.sys.publishedAt,
                  url,
                }
              : undefined;
          } catch (error) {
            console.error('Error creating URL for sitemap item:', error);
            return undefined;
          }
        }),
      ),
    )
    .filter(field => field !== undefined);

  return fields;
}