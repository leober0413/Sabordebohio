
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias_gasto": {
                  Row: {
                    "activo": boolean,"creado_en": string,"es_sistema": boolean,"id": string,"nombre": string
                  }
                  Insert: {
                    "activo"?: boolean,"creado_en"?: string,"es_sistema"?: boolean,"id"?: string,"nombre": string
                  }
                  Update: {
                    "activo"?: boolean,"creado_en"?: string,"es_sistema"?: boolean,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clientes": {
                  Row: {
                    "activo": boolean,"creado_en": string,"id": string,"nombre": string,"notas": string | null,"telefono": string | null
                  }
                  Insert: {
                    "activo"?: boolean,"creado_en"?: string,"id"?: string,"nombre": string,"notas"?: string | null,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"creado_en"?: string,"id"?: string,"nombre"?: string,"notas"?: string | null,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"config_precios": {
                  Row: {
                    "actualizado_en": string,"actualizado_por": string | null,"id": number,"minimo_docena": number,"precio_docena": number,"precio_suelta": number | null,"redondeo": number
                  }
                  Insert: {
                    "actualizado_en"?: string,"actualizado_por"?: string | null,"id"?: number,"minimo_docena"?: number,"precio_docena": number,"precio_suelta"?: number | null,"redondeo"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"actualizado_por"?: string | null,"id"?: number,"minimo_docena"?: number,"precio_docena"?: number,"precio_suelta"?: number | null,"redondeo"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "config_precios_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "creado_en": string,"id": string,"nombre": string
                  }
                  Insert: {
                    "creado_en"?: string,"id": string,"nombre": string
                  }
                  Update: {
                    "creado_en"?: string,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"creado_en": string,"id": string,"nombre": string,"orden": number,"stock_minimo": number | null
                  }
                  Insert: {
                    "activo"?: boolean,"creado_en"?: string,"id"?: string,"nombre": string,"orden"?: number,"stock_minimo"?: number | null
                  }
                  Update: {
                    "activo"?: boolean,"creado_en"?: string,"id"?: string,"nombre"?: string,"orden"?: number,"stock_minimo"?: number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "calcular_precio":
{ Args: { "unidades": number }; Returns: {
              "precio_docena": number,"precio_suelta": number,"redondeo": number,"subtotal": number,"tarifa": Database["public"]['Enums']["tarifa_aplicada"]
            }[]
                           },
"es_dueno":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"exigir_dueno":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            "estado_pedido": "pendiente"|"listo"|"entregado"|"cancelado","metodo_pago": "efectivo"|"transferencia","tarifa_aplicada": "suelta"|"docena","tipo_entrega": "recoge"|"delivery","tipo_mov_ingrediente": "compra"|"ajuste"|"conteo","tipo_mov_producto": "tanda"|"entrega"|"reverso_entrega"|"hecho_al_momento"|"ajuste"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_pedido": ["pendiente", "listo", "entregado", "cancelado"],"metodo_pago": ["efectivo", "transferencia"],"tarifa_aplicada": ["suelta", "docena"],"tipo_entrega": ["recoge", "delivery"],"tipo_mov_ingrediente": ["compra", "ajuste", "conteo"],"tipo_mov_producto": ["tanda", "entrega", "reverso_entrega", "hecho_al_momento", "ajuste"]
          }
        }
} as const
