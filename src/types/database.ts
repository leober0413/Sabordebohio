
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
            "abonos": {
                  Row: {
                    "anulado_en": string | null,"cliente_id": string,"creado_en": string,"creado_por": string,"fecha": string,"id": string,"metodo": Database["public"]['Enums']["metodo_pago"],"monto": number
                  }
                  Insert: {
                    "anulado_en"?: string | null,"cliente_id": string,"creado_en"?: string,"creado_por"?: string,"fecha": string,"id"?: string,"metodo": Database["public"]['Enums']["metodo_pago"],"monto": number
                  }
                  Update: {
                    "anulado_en"?: string | null,"cliente_id"?: string,"creado_en"?: string,"creado_por"?: string,"fecha"?: string,"id"?: string,"metodo"?: Database["public"]['Enums']["metodo_pago"],"monto"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "abonos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "abonos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_saldos_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "abonos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_gasto": {
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
                },"movimientos_producto": {
                  Row: {
                    "cantidad": number,"creado_en": string,"creado_por": string,"id": string,"motivo": string | null,"pedido_id": string | null,"producto_id": string,"tanda_id": string | null,"tipo": Database["public"]['Enums']["tipo_mov_producto"]
                  }
                  Insert: {
                    "cantidad": number,"creado_en"?: string,"creado_por"?: string,"id"?: string,"motivo"?: string | null,"pedido_id"?: string | null,"producto_id": string,"tanda_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_mov_producto"]
                  }
                  Update: {
                    "cantidad"?: number,"creado_en"?: string,"creado_por"?: string,"id"?: string,"motivo"?: string | null,"pedido_id"?: string | null,"producto_id"?: string,"tanda_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_mov_producto"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_producto_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "v_pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_stock_productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_tanda_id_fkey"
      columns: ["tanda_id"]
isOneToOne: false
      referencedRelation: "tandas"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos": {
                  Row: {
                    "abono_id": string | null,"anulado_en": string | null,"creado_en": string,"creado_por": string,"fecha": string,"id": string,"metodo": Database["public"]['Enums']["metodo_pago"],"monto": number,"pedido_id": string
                  }
                  Insert: {
                    "abono_id"?: string | null,"anulado_en"?: string | null,"creado_en"?: string,"creado_por"?: string,"fecha": string,"id"?: string,"metodo": Database["public"]['Enums']["metodo_pago"],"monto": number,"pedido_id": string
                  }
                  Update: {
                    "abono_id"?: string | null,"anulado_en"?: string | null,"creado_en"?: string,"creado_por"?: string,"fecha"?: string,"id"?: string,"metodo"?: Database["public"]['Enums']["metodo_pago"],"monto"?: number,"pedido_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagos_abono_id_fkey"
      columns: ["abono_id"]
isOneToOne: false
      referencedRelation: "abonos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "v_pedidos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedido_lineas": {
                  Row: {
                    "cantidad": number,"creado_en": string,"id": string,"pedido_id": string,"producto_id": string
                  }
                  Insert: {
                    "cantidad": number,"creado_en"?: string,"id"?: string,"pedido_id": string,"producto_id": string
                  }
                  Update: {
                    "cantidad"?: number,"creado_en"?: string,"id"?: string,"pedido_id"?: string,"producto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_lineas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_lineas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "v_pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_lineas_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_lineas_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_stock_productos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "actualizado_en": string,"cliente_id": string,"costo_envio": number,"creado_en": string,"creado_por": string,"entregado_en": string | null,"estado": Database["public"]['Enums']["estado_pedido"],"fecha_entrega": string,"hora_entrega": string | null,"id": string,"notas": string | null,"precio_docena_aplicado": number,"precio_suelta_aplicado": number | null,"redondeo_aplicado": number,"subtotal": number,"tarifa": Database["public"]['Enums']["tarifa_aplicada"],"tipo_entrega": Database["public"]['Enums']["tipo_entrega"],"total": number,"unidades": number,"version": number
                  }
                  Insert: {
                    "actualizado_en"?: string,"cliente_id": string,"costo_envio"?: number,"creado_en"?: string,"creado_por"?: string,"entregado_en"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"],"fecha_entrega": string,"hora_entrega"?: string | null,"id"?: string,"notas"?: string | null,"precio_docena_aplicado": number,"precio_suelta_aplicado"?: number | null,"redondeo_aplicado": number,"subtotal": number,"tarifa": Database["public"]['Enums']["tarifa_aplicada"],"tipo_entrega"?: Database["public"]['Enums']["tipo_entrega"],"total": number,"unidades": number,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"cliente_id"?: string,"costo_envio"?: number,"creado_en"?: string,"creado_por"?: string,"entregado_en"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"],"fecha_entrega"?: string,"hora_entrega"?: string | null,"id"?: string,"notas"?: string | null,"precio_docena_aplicado"?: number,"precio_suelta_aplicado"?: number | null,"redondeo_aplicado"?: number,"subtotal"?: number,"tarifa"?: Database["public"]['Enums']["tarifa_aplicada"],"tipo_entrega"?: Database["public"]['Enums']["tipo_entrega"],"total"?: number,"unidades"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_saldos_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_creado_por_fkey"
      columns: ["creado_por"]
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
                },"tandas": {
                  Row: {
                    "creado_en": string,"creado_por": string,"fecha": string,"id": string,"notas": string | null
                  }
                  Insert: {
                    "creado_en"?: string,"creado_por"?: string,"fecha": string,"id"?: string,"notas"?: string | null
                  }
                  Update: {
                    "creado_en"?: string,"creado_por"?: string,"fecha"?: string,"id"?: string,"notas"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tandas_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_pedidos": {
                  Row: {
                    "actualizado_en": string | null,"atrasado": boolean | null,"cliente_id": string | null,"cliente_nombre": string | null,"cliente_telefono": string | null,"costo_envio": number | null,"creado_en": string | null,"creado_por": string | null,"entregado_en": string | null,"estado": Database["public"]['Enums']["estado_pedido"] | null,"estado_pago": Database["public"]['Enums']["estado_pago"] | null,"fecha_entrega": string | null,"hora_entrega": string | null,"id": string | null,"lineas": Json | null,"notas": string | null,"pagado": number | null,"precio_docena_aplicado": number | null,"precio_suelta_aplicado": number | null,"redondeo_aplicado": number | null,"saldo": number | null,"subtotal": number | null,"tarifa": Database["public"]['Enums']["tarifa_aplicada"] | null,"tipo_entrega": Database["public"]['Enums']["tipo_entrega"] | null,"total": number | null,"unidades": number | null,"version": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_saldos_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"v_saldos_clientes": {
                  Row: {
                    "activo": boolean | null,"fiado_desde": string | null,"id": string | null,"nombre": string | null,"pedidos_fiados": number | null,"saldo_fiado": number | null,"saldo_total": number | null,"telefono": string | null
                  }
                  Relationships: [
                    
                  ]
                },"v_stock_productos": {
                  Row: {
                    "activo": boolean | null,"bajo_minimo": boolean | null,"id": string | null,"negativo": boolean | null,"nombre": string | null,"orden": number | null,"stock": number | null,"stock_minimo": number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "actualizar_pedido":
{ Args: { "p_cliente_id": string,"p_costo_envio"?: number,"p_fecha_entrega": string,"p_hora_entrega"?: string,"p_id": string,"p_lineas": Json,"p_notas"?: string,"p_tipo_entrega"?: Database["public"]['Enums']["tipo_entrega"],"p_version": number }; Returns: {
              "actualizado_en": string,
"cliente_id": string,
"costo_envio": number,
"creado_en": string,
"creado_por": string,
"entregado_en": string | null,
"estado": Database["public"]['Enums']["estado_pedido"],
"fecha_entrega": string,
"hora_entrega": string | null,
"id": string,
"notas": string | null,
"precio_docena_aplicado": number,
"precio_suelta_aplicado": number | null,
"redondeo_aplicado": number,
"subtotal": number,
"tarifa": Database["public"]['Enums']["tarifa_aplicada"],
"tipo_entrega": Database["public"]['Enums']["tipo_entrega"],
"total": number,
"unidades": number,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "pedidos"
        isOneToOne: true
        isSetofReturn: false
      } },
"anular_abono":
{ Args: { "p_abono_id": string }; Returns: {
              "anulado_en": string | null,
"cliente_id": string,
"creado_en": string,
"creado_por": string,
"fecha": string,
"id": string,
"metodo": Database["public"]['Enums']["metodo_pago"],
"monto": number
            }
                          SetofOptions: {
        from: "*"
        to: "abonos"
        isOneToOne: true
        isSetofReturn: false
      } },
"anular_pago":
{ Args: { "p_pago_id": string }; Returns: {
              "abono_id": string | null,
"anulado_en": string | null,
"creado_en": string,
"creado_por": string,
"fecha": string,
"id": string,
"metodo": Database["public"]['Enums']["metodo_pago"],
"monto": number,
"pedido_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "pagos"
        isOneToOne: true
        isSetofReturn: false
      } },
"calcular_precio":
{ Args: { "unidades": number }; Returns: {
              "precio_docena": number,"precio_suelta": number,"redondeo": number,"subtotal": number,"tarifa": Database["public"]['Enums']["tarifa_aplicada"]
            }[]
                           },
"cambiar_estado":
{ Args: { "p_estado": Database["public"]['Enums']["estado_pedido"],"p_hecho_al_momento"?: boolean,"p_id": string,"p_pago"?: Json }; Returns: {
              "actualizado_en": string,
"cliente_id": string,
"costo_envio": number,
"creado_en": string,
"creado_por": string,
"entregado_en": string | null,
"estado": Database["public"]['Enums']["estado_pedido"],
"fecha_entrega": string,
"hora_entrega": string | null,
"id": string,
"notas": string | null,
"precio_docena_aplicado": number,
"precio_suelta_aplicado": number | null,
"redondeo_aplicado": number,
"subtotal": number,
"tarifa": Database["public"]['Enums']["tarifa_aplicada"],
"tipo_entrega": Database["public"]['Enums']["tipo_entrega"],
"total": number,
"unidades": number,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "pedidos"
        isOneToOne: true
        isSetofReturn: false
      } },
"crear_pedido":
{ Args: { "p_cliente_id": string,"p_costo_envio"?: number,"p_fecha_entrega"?: string,"p_hora_entrega"?: string,"p_lineas": Json,"p_notas"?: string,"p_pago"?: Json,"p_tipo_entrega"?: Database["public"]['Enums']["tipo_entrega"] }; Returns: {
              "actualizado_en": string,
"cliente_id": string,
"costo_envio": number,
"creado_en": string,
"creado_por": string,
"entregado_en": string | null,
"estado": Database["public"]['Enums']["estado_pedido"],
"fecha_entrega": string,
"hora_entrega": string | null,
"id": string,
"notas": string | null,
"precio_docena_aplicado": number,
"precio_suelta_aplicado": number | null,
"redondeo_aplicado": number,
"subtotal": number,
"tarifa": Database["public"]['Enums']["tarifa_aplicada"],
"tipo_entrega": Database["public"]['Enums']["tipo_entrega"],
"total": number,
"unidades": number,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "pedidos"
        isOneToOne: true
        isSetofReturn: false
      } },
"es_dueno":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"exigir_dueno":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"hoy":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"registrar_abono":
{ Args: { "p_cliente_id": string,"p_fecha"?: string,"p_metodo": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_pedido_id"?: string }; Returns: {
              "anulado_en": string | null,
"cliente_id": string,
"creado_en": string,
"creado_por": string,
"fecha": string,
"id": string,
"metodo": Database["public"]['Enums']["metodo_pago"],
"monto": number
            }
                          SetofOptions: {
        from: "*"
        to: "abonos"
        isOneToOne: true
        isSetofReturn: false
      } },
"registrar_pago":
{ Args: { "p_fecha"?: string,"p_metodo": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_pedido_id": string }; Returns: {
              "abono_id": string | null,
"anulado_en": string | null,
"creado_en": string,
"creado_por": string,
"fecha": string,
"id": string,
"metodo": Database["public"]['Enums']["metodo_pago"],
"monto": number,
"pedido_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "pagos"
        isOneToOne: true
        isSetofReturn: false
      } },
"registrar_tanda":
{ Args: { "p_fecha"?: string,"p_lineas": Json,"p_notas"?: string }; Returns: {
              "creado_en": string,
"creado_por": string,
"fecha": string,
"id": string,
"notas": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "tandas"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "estado_pago": "pendiente"|"parcial"|"pagado","estado_pedido": "pendiente"|"listo"|"entregado"|"cancelado","metodo_pago": "efectivo"|"transferencia","tarifa_aplicada": "suelta"|"docena","tipo_entrega": "recoge"|"delivery","tipo_mov_ingrediente": "compra"|"ajuste"|"conteo","tipo_mov_producto": "tanda"|"entrega"|"reverso_entrega"|"hecho_al_momento"|"ajuste"
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
            "estado_pago": ["pendiente", "parcial", "pagado"],"estado_pedido": ["pendiente", "listo", "entregado", "cancelado"],"metodo_pago": ["efectivo", "transferencia"],"tarifa_aplicada": ["suelta", "docena"],"tipo_entrega": ["recoge", "delivery"],"tipo_mov_ingrediente": ["compra", "ajuste", "conteo"],"tipo_mov_producto": ["tanda", "entrega", "reverso_entrega", "hecho_al_momento", "ajuste"]
          }
        }
} as const
