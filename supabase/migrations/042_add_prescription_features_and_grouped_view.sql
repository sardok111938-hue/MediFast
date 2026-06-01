-- 030_add_prescription_features_and_grouped_view.sql

-- Vendor Grouped Products View (using existing products table)
CREATE OR REPLACE VIEW public.vendor_grouped_products AS
SELECT
    p.vendor_id,
    p.category_id,
    c.name as category_name,
    c.name_ar as category_name_ar,
    jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'name_ar', null,
            'price', p.price,
            'stock', p.stock_quantity,
            'is_active', p.is_active,
            'image_url', COALESCE(p.image_url, gp.image_url),
            'barcode', p.barcode
        ) ORDER BY p.name
    ) as products
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.global_products gp ON gp.barcode = p.barcode
WHERE p.is_active = true
GROUP BY p.vendor_id, p.category_id, c.name, c.name_ar;

-- RPC: vendor_respond_prescription_request
CREATE OR REPLACE FUNCTION public.vendor_respond_prescription_request(
    p_request_id uuid,
    p_vendor_note text DEFAULT NULL,
    p_status text DEFAULT 'responded'
)
RETURNS public.prescription_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_request public.prescription_requests;
BEGIN
    SELECT * INTO v_request FROM public.prescription_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription request not found';
    END IF;
    IF auth.uid() != v_request.vendor_id THEN
        RAISE EXCEPTION 'Unauthorized: only the assigned vendor can respond';
    END IF;
    UPDATE public.prescription_requests
    SET vendor_note = p_vendor_note,
        status = p_status,
        responded_at = now(),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;
    RETURN v_request;
END;
$$;

-- RPC: create_cod_order_from_quote
CREATE OR REPLACE FUNCTION public.create_cod_order_from_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order_id uuid;
BEGIN
    INSERT INTO public.orders (
        customer_id,
        vendor_id,
        status,
        payment_method,
        prescription_quote_id,
        notes
    )
    SELECT
        customer_id,
        vendor_id,
        'placed',
        'cod',
        p_quote_id,
        'Created from prescription quote'
    FROM public.prescription_quotes
    WHERE id = p_quote_id
    RETURNING id INTO v_order_id;
    RETURN v_order_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.vendor_respond_prescription_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_cod_order_from_quote TO authenticated;

COMMENT ON VIEW public.vendor_grouped_products IS 'Products grouped by vendor and category for catalog display';
COMMENT ON FUNCTION public.vendor_respond_prescription_request IS 'Allows vendor to respond to prescription request';
COMMENT ON FUNCTION public.create_cod_order_from_quote IS 'Creates a COD order from a prescription quote';