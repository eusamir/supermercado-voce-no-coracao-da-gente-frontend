import { Routes } from '@angular/router';
import { CatalogPage } from './pages/catalog.page';
import { ProductPage } from './pages/product.page';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { CartPage } from './pages/cart.page';
import { CheckoutPage } from './pages/checkout.page';
import { OrdersPage } from './pages/orders.page';
import { OrderPage } from './pages/order.page';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: CatalogPage, title: 'Mercadinho | Comprar' },
  { path: 'produto/:id', component: ProductPage, title: 'Produto | Mercadinho' },
  { path: 'login', component: LoginPage, title: 'Entrar | Mercadinho' },
  { path: 'login/callback', component: LoginPage, title: 'Autenticando | Mercadinho' },
  { path: 'cadastro', component: RegisterPage, title: 'Criar conta | Mercadinho' },
  { path: 'carrinho', component: CartPage, canActivate: [authGuard], title: 'Meu carrinho | Mercadinho' },
  { path: 'checkout', component: CheckoutPage, canActivate: [authGuard], title: 'Checkout | Mercadinho' },
  { path: 'pedidos', component: OrdersPage, canActivate: [authGuard], title: 'Meus pedidos | Mercadinho' },
  { path: 'pedidos/:id', component: OrderPage, canActivate: [authGuard], title: 'Pedido | Mercadinho' },
  { path: '**', redirectTo: '' },
];
