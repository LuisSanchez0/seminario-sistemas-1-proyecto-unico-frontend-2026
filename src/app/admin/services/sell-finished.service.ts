import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
// import {
//   SellFinishedResponse,
//   SellFinishedUploadResponse,
// } from '../../sell/interfaces/sell.interface';

const baseUrl = environment.baseUrl;

export interface SendEmailResponse {
  ok: boolean;
  msg?: string;
}

@Injectable({ providedIn: 'root' })
export class SellFinishedService {
  private readonly http = inject(HttpClient);

  // createSellFinished(sellId: string): Observable<SellFinishedResponse> {
  //   return this.http.post<SellFinishedResponse>(`${baseUrl}/sell-finished`, {
  //     sell: sellId,
  //   });
  // }

  // getSellFinishedBySellId(sellId: string): Observable<SellFinishedResponse> {
  //   return this.http.get<SellFinishedResponse>(
  //     `${baseUrl}/sell-finished/sell/${sellId}`,
  //   );
  // }

  // getSellFinishedById(id: string): Observable<SellFinishedResponse> {
  //   return this.http.get<SellFinishedResponse>(`${baseUrl}/sell-finished/${id}`);
  // }

  // uploadInvoicePdf(
  //   sellFinishedId: string,
  //   file: File,
  // ): Observable<SellFinishedUploadResponse> {
  //   const formData = new FormData();
  //   formData.append('archivo', file);
  //   return this.http.post<SellFinishedUploadResponse>(
  //     `${baseUrl}/upload/sell-finished/${sellFinishedId}/invoice-pdf`,
  //     formData,
  //   );
  // }

  // uploadShippingGuide(
  //   sellFinishedId: string,
  //   file: File,
  // ): Observable<SellFinishedUploadResponse> {
  //   const formData = new FormData();
  //   formData.append('archivo', file);
  //   return this.http.post<SellFinishedUploadResponse>(
  //     `${baseUrl}/upload/sell-finished/${sellFinishedId}/shipping-guide`,
  //     formData,
  //   );
  // }

  sendEmail(sellFinishedId: string): Observable<SendEmailResponse> {
    return this.http.post<SendEmailResponse>(
      `${baseUrl}/sell-finished/${sellFinishedId}/send-email`,
      {},
    );
  }
}
