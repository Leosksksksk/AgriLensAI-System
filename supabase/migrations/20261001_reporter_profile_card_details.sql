CREATE OR REPLACE FUNCTION public.get_nearby_outbreaks(target_barangay text)
RETURNS TABLE(disease_id text, farm_count bigint, reporters jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    sr.disease_id,
    count(DISTINCT sr.farmer_id) AS farm_count,
    coalesce(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', f.id,
          'full_name', f.full_name,
          'barangay', f.barangay,
          'profile_image_url', f.profile_image_url,
          'farm_size', f.farm_size,
          'crop_types', f.crop_types
        )
      ) FILTER (WHERE f.id IS NOT NULL),
      '[]'::jsonb
    ) AS reporters
  FROM public.scan_results AS sr
  JOIN public.farmers AS f ON f.id = sr.farmer_id
  WHERE f.barangay = target_barangay
    AND sr.farmer_id <> auth.uid()
    AND sr.disease_id IS NOT NULL
    AND sr.disease_id <> 'healthy'
    AND sr.created_at > now() - interval '7 days'
  GROUP BY sr.disease_id
  ORDER BY farm_count DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_outbreaks(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_outbreaks(text) TO authenticated;