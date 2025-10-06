import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { NodeObj } from '../models/nodes/node';
import { NodeApiResponse } from '../models/nodes/node-api-response';
import { NodeOperationalHistory } from '../models/nodes/node-operational-history';
import { NodeStatus } from '../models/nodes/node-status';



const jsonHttpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
  })
};

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  baseUrl: string = environment.baseUrl;
  nodeUrl: string = `${this.baseUrl}/api/v1/core/node-manager/node`
  nodeStatusUrl: string = `${this.baseUrl}/api/v1/core/node-manager/node-status`
  nodeOperationalHistoryUrl = `${this.baseUrl}/api/v1/core/node-manager/node-operational-history`


  constructor(private http: HttpClient) { }


  getNodes(startIdx: number, size: number): Observable<NodeObj[]> {
    console.debug("Called node.getNodes()")
    return this.http.get<NodeObj[]>(`${this.nodeUrl}?startIdx=${startIdx}&size=${size}`, jsonHttpOptions)
  }

  getNode(id: string): Observable<NodeObj> {
    console.debug("Called node.getNode() for id=" + id)
    return this.http.get<NodeObj>(`${this.nodeUrl}/${id}`, jsonHttpOptions)
  }

  createNode(node: NodeObj): Observable<NodeApiResponse> {
    console.debug("Called node.createNode()")
    return this.http.post<NodeApiResponse>(`${this.nodeUrl}`, node, jsonHttpOptions)
  }

  updateNode(node: NodeObj): Observable<NodeApiResponse> {
    console.debug("Called node.getNode()")
    return this.http.put<NodeApiResponse>(`${this.nodeUrl}/${node.id}`, node, jsonHttpOptions)
  }

  deleteNode(id: string): Observable<NodeApiResponse> {
    console.debug("Called node.deleteNode() for id=" + id)
    return this.http.delete<NodeApiResponse>(`${this.nodeUrl}/${id}`, jsonHttpOptions)
  }

  getNodeStatus(id: string): Observable<NodeStatus> {
    console.debug("Called node.getNodeStatus() for id=" + id)
    return this.http.get<NodeStatus>(`${this.nodeStatusUrl}/${id}`, jsonHttpOptions)
  }

  getRandomInt(min: number, max: number) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
  }

  createNodeStatus(node: NodeObj): Observable<NodeApiResponse> {
    console.debug("Called node.createNodeStatus()")
    return this.http.post<NodeApiResponse>(`${this.nodeStatusUrl}`, node, jsonHttpOptions)
  }

  deleteNodeStatus(id: string): Observable<NodeApiResponse> {
    console.debug("Called node.deleteNodeStatus() for id=" + id)
    return this.http.delete<NodeApiResponse>(`${this.nodeStatusUrl}/${id}`, jsonHttpOptions)
  }

  getNodeOperationalHistory(id: string): Observable<NodeOperationalHistory[]> {
    console.debug("Called node.getNodeOperationalHistory() for id=" + id)
    return this.http.get<NodeOperationalHistory[]>(`${this.nodeOperationalHistoryUrl}/${id}`, jsonHttpOptions)
  }

  createNodeOperationalHistory(node: NodeObj): Observable<NodeApiResponse> {
    console.debug("Called node.createNodeOperationalHistory()")
    return this.http.post<NodeApiResponse>(`${this.nodeOperationalHistoryUrl}`, node, jsonHttpOptions)
  }

  deleteNodeOperationalHistory(id: string): Observable<NodeApiResponse> {
    console.debug("Called node.deleteNodeOperationalHistory() for id=" + id)
    return this.http.delete<NodeApiResponse>(`${this.nodeOperationalHistoryUrl}/${id}`, jsonHttpOptions)
  }

}
