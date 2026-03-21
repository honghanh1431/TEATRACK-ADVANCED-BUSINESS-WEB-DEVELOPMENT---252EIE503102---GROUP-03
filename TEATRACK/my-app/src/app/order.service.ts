import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private apiUrl = 'https://teatrack-advanced-business-web.onrender.com/api/orders';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
    }

    createOrder(orderData: any): Observable<any> {
        return this.http.post(this.apiUrl, orderData, { headers: this.getHeaders() });
    }

    getMyOrders(): Observable<{ orders: any[] }> {
        return this.http.get<{ orders: any[] }>(this.apiUrl, { headers: this.getHeaders() });
    }

    getOrderById(orderId: string): Observable<{ order: any }> {
        return this.http.get<{ order: any }>(`${this.apiUrl}/${encodeURIComponent(orderId)}`, { headers: this.getHeaders() });
    }

    cancelOrder(orderId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${encodeURIComponent(orderId)}/cancel`, {}, { headers: this.getHeaders() });
    }
}
