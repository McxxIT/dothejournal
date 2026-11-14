export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TradeStatus = 'open' | 'closed'
export type TradeDirection = 'long' | 'short'

export type TradingAccountRow = {
  id: string
  user_id: string
  name: string
  broker: string | null
  account_type: string | null
  starting_balance: number
  daily_loss_limit: number | null
  created_at: string
}

export type TradeRow = {
  id: string
  user_id: string
  account_id: string
  symbol: string
  asset_class: string
  direction: TradeDirection
  status: TradeStatus
  entry_time: string
  exit_time: string | null
  avg_entry_price: number
  avg_exit_price: number | null
  total_quantity: number
  gross_pnl: number | null
  fees: number
  net_pnl: number | null
  initial_risk_amount: number | null
  r_multiple: number | null
  notes: string | null
  tags: string[] | null
  created_at: string
}

type TradingAccountInsert = Omit<
  TradingAccountRow,
  'id' | 'created_at' | 'broker' | 'account_type' | 'daily_loss_limit'
> & {
  id?: string
  created_at?: string
  broker?: string | null
  account_type?: string | null
  daily_loss_limit?: number | null
}

type TradeInsert = Omit<TradeRow, 'id' | 'created_at' | 'net_pnl'> & {
  id?: string
  created_at?: string
}

export interface Database {
  public: {
    Tables: {
      trading_accounts: {
        Row: TradingAccountRow
        Insert: TradingAccountInsert
        Update: Partial<Omit<TradingAccountRow, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      trades: {
        Row: TradeRow
        Insert: TradeInsert
        Update: Partial<Omit<TradeRow, 'id' | 'user_id' | 'net_pnl' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
