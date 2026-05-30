package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/services"
)

type ProductHandler struct {
	svc *services.ProductService
}

func NewProductHandler(svc *services.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

// POST /api/v1/products/scan
func (h *ProductHandler) Scan(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		Barcode string `json:"barcode"`
	}
	if err := c.BodyParser(&body); err != nil || body.Barcode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "barcode is required"})
	}

	product, err := h.svc.ScanBarcode(c.Context(), userID, body.Barcode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "scan failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"product": product})
}

// GET /api/v1/products/history
func (h *ProductHandler) GetHistory(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	products, err := h.svc.GetHistory(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{"products": products})
}
