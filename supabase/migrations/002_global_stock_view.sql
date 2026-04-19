CREATE MATERIALIZED VIEW global_stock AS
SELECT
  p.id                                                          AS product_id,
  p.name                                                        AS product_name,
  p.barcode,
  p.unit,
  SUM(si."quantityOnHand")                                      AS total_on_hand,
  SUM(si."quantityReserved")                                    AS total_reserved,
  SUM(si."quantityOnHand" - si."quantityReserved")              AS total_available,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'store_id',   si."storeId",
      'store_name', s.name,
      'on_hand',    si."quantityOnHand",
      'reserved',   si."quantityReserved"
    ) ORDER BY s.name
  ) AS per_store
FROM products p
JOIN store_inventory si ON si."productId" = p.id
JOIN stores s           ON s.id = si."storeId"
WHERE p."isActive" = TRUE
GROUP BY p.id, p.name, p.barcode, p.unit;

CREATE UNIQUE INDEX global_stock_product_id_idx ON global_stock (product_id);
